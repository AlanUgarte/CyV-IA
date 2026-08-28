import {
  Injectable, Inject, BadRequestException,
  NotFoundException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import Stripe from 'stripe';
import { DATABASE_POOL } from '../database/database.module';
import { EmailService } from '../common/services/email.service';
import { CreditsService } from '../credits/credits.service';
import { CREDIT_PACKS } from '../config/plans.config';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly db: Pool,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly credits: CreditsService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('stripe.secretKey')!, {
      apiVersion: '2023-10-16',
    });
  }

  // ── Plan price map ────────────────────────────────────────────────────────

  private getPriceId(planName: string): string {
    const prices = this.config.get('stripe.prices');
    const priceId = prices[planName];
    if (!priceId) throw new BadRequestException(`Plan inválido: ${planName}`);
    return priceId;
  }

  // ── Create Checkout Session ────────────────────────────────────────────────

  async createCheckoutSession(userId: string, planName: string) {
    const { rows } = await this.db.query(
      'SELECT id, email, full_name FROM users WHERE id = $1',
      [userId],
    );
    if (rows.length === 0) throw new NotFoundException('Usuario no encontrado');
    const user = rows[0];

    // Get or create Stripe customer
    let customerId = await this.getStripeCustomerId(userId);
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const priceId = this.getPriceId(planName);
    const frontendUrl = this.config.get<string>('frontendUrl');

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/pricing`,
      metadata: { userId, planName },
      subscription_data: {
        metadata: { userId, planName },
        trial_period_days: 7,
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  // ── Checkout de PACK de créditos (pago único) ──────────────────────────────
  async createPackCheckout(userId: string, packKey: string) {
    const pack = CREDIT_PACKS.find(p => p.key === packKey);
    if (!pack) throw new BadRequestException('Pack inválido');
    const { rows } = await this.db.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
    if (!rows.length) throw new NotFoundException('Usuario no encontrado');

    let customerId = await this.getStripeCustomerId(userId);
    if (!customerId) {
      const customer = await this.stripe.customers.create({ email: rows[0].email, name: rows[0].full_name, metadata: { userId } });
      customerId = customer.id;
    }
    const frontendUrl = this.config.get<string>('frontendUrl');
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: pack.priceUsd * 100, product_data: { name: `${pack.credits} créditos Conversia AI` } } }],
      success_url: `${frontendUrl}/dashboard/credits?purchase=ok`,
      cancel_url: `${frontendUrl}/dashboard/credits`,
      metadata: { userId, packKey: pack.key, credits: String(pack.credits) },
    });
    return { url: session.url, sessionId: session.id };
  }

  // ── Create Customer Portal ────────────────────────────────────────────────

  async createPortalSession(userId: string) {
    const customerId = await this.getStripeCustomerId(userId);
    if (!customerId) throw new BadRequestException('No existe suscripción activa');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.config.get('frontendUrl')}/settings/billing`,
    });
    return { url: session.url };
  }

  // ── Webhook handler ───────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.get<string>('stripe.webhookSecret')!,
      );
    } catch {
      throw new BadRequestException('Webhook signature inválida');
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { userId, planName, packKey, credits } = session.metadata!;
    if (!userId) return;

    // Compra de pack de créditos (pago único) → acreditar
    if (packKey) {
      await this.credits.grant(userId, Number(credits), 'purchase', { packKey, session: session.id });
      this.logger.log(`Pack ${packKey} (${credits} créditos) acreditado a ${userId}`);
      return;
    }

    const planResult = await this.db.query(
      'SELECT id FROM plans WHERE name = $1',
      [planName],
    );
    if (planResult.rows.length === 0) return;

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Upsert subscription
    await this.db.query(
      `INSERT INTO subscriptions
         (user_id, plan_id, status, stripe_subscription_id, stripe_customer_id,
          current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         updated_at = NOW()`,
      [
        userId,
        planResult.rows[0].id,
        subscription.status,
        subscription.id,
        session.customer as string,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
      ],
    );

    // Activate user if pending
    await this.db.query(
      "UPDATE users SET status = 'active' WHERE id = $1 AND status = 'pending_verification'",
      [userId],
    );

    // Send welcome email
    const userResult = await this.db.query(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId],
    );
    if (userResult.rows.length > 0) {
      await this.emailService.sendWelcome(
        userResult.rows[0].email,
        userResult.rows[0].full_name,
        planName,
      );
    }

    this.logger.log(`✅ Subscription activated for user ${userId} — plan: ${planName}`);
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription) {
    const planName = sub.metadata?.planName;
    if (planName) {
      const planResult = await this.db.query(
        'SELECT id FROM plans WHERE name = $1', [planName],
      );
      if (planResult.rows.length > 0) {
        await this.db.query(
          `UPDATE subscriptions SET
             plan_id = $1, status = $2,
             current_period_start = $3, current_period_end = $4, updated_at = NOW()
           WHERE stripe_subscription_id = $5`,
          [
            planResult.rows[0].id, sub.status,
            new Date(sub.current_period_start * 1000),
            new Date(sub.current_period_end * 1000),
            sub.id,
          ],
        );
      }
    }
  }

  private async handleSubscriptionDeleted(sub: Stripe.Subscription) {
    await this.db.query(
      `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [sub.id],
    );
    this.logger.log(`Subscription canceled: ${sub.id}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    await this.db.query(
      `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [invoice.subscription as string],
    );
    this.logger.warn(`Payment failed for subscription: ${invoice.subscription}`);
  }

  private async getStripeCustomerId(userId: string): Promise<string | null> {
    const { rows } = await this.db.query(
      `SELECT stripe_customer_id FROM subscriptions
       WHERE user_id = $1 AND stripe_customer_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return rows[0]?.stripe_customer_id ?? null;
  }

  // ── Get current subscription ──────────────────────────────────────────────

  async getSubscription(userId: string) {
    const { rows } = await this.db.query(
      `SELECT s.*, p.name as plan_name, p.display_name, p.price_usd_cents,
              p.max_campaigns, p.max_creatives, p.features
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1 AND s.status IN ('active','trialing')
       ORDER BY s.created_at DESC LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  // ── Usage check ───────────────────────────────────────────────────────────

  async checkCampaignLimit(userId: string): Promise<{ allowed: boolean; used: number; max: number | null }> {
    const sub = await this.getSubscription(userId);
    if (!sub) return { allowed: false, used: 0, max: 0 };

    const { rows } = await this.db.query(
      "SELECT COUNT(*) as cnt FROM campaigns WHERE user_id = $1 AND status != 'completed'",
      [userId],
    );
    const used = parseInt(rows[0].cnt);
    const max = sub.max_campaigns; // null = unlimited
    return { allowed: max === null || used < max, used, max };
  }
}
