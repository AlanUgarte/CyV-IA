import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export type TxType = 'subscription_grant' | 'purchase' | 'generation' | 'refund' | 'manual_adjustment' | 'expiration';

export interface ReserveInput {
  userId: string; role: string; amount: number;
  operation?: string; provider?: string; model?: string;
  campaignId?: string; creativeId?: string;
  idempotencyKey?: string; meta?: any;
}

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  async balance(userId: string): Promise<number> {
    const { rows } = await this.db.query('SELECT ai_credits FROM users WHERE id = $1', [userId]);
    return rows[0]?.ai_credits ?? 0;
  }

  // Reserva (hold): descuenta ya, con idempotencia y sin permitir saldo negativo.
  // Admin: bypass (sin cobro, sin fila). Devuelve txId=null.
  async reserve(input: ReserveInput): Promise<{ txId: string | null; balanceAfter: number }> {
    if (input.role === 'admin' || input.amount <= 0) {
      return { txId: null, balanceAfter: await this.balance(input.userId) };
    }
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Idempotencia: si ya existe esa key, devolver la reserva previa (no doble cobro)
      if (input.idempotencyKey) {
        const { rows: dup } = await client.query(
          `SELECT id, balance_after FROM credit_transactions WHERE idempotency_key = $1 LIMIT 1`,
          [input.idempotencyKey],
        );
        if (dup.length) { await client.query('COMMIT'); return { txId: dup[0].id, balanceAfter: dup[0].balance_after }; }
      }

      // Descuento atómico sin negativo
      const { rows } = await client.query(
        `UPDATE users SET ai_credits = ai_credits - $2
         WHERE id = $1 AND ai_credits >= $2
         RETURNING ai_credits AS after, ai_credits + $2 AS before`,
        [input.userId, input.amount],
      );
      if (!rows.length) { await client.query('ROLLBACK'); throw new BadRequestException('SIN_CREDITOS'); }

      const { rows: tx } = await client.query(
        `INSERT INTO credit_transactions
           (user_id, type, amount, status, balance_before, balance_after, operation, provider, model, campaign_id, creative_id, idempotency_key, meta)
         VALUES ($1,'generation',$2,'reserved',$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [input.userId, -input.amount, rows[0].before, rows[0].after, input.operation ?? null, input.provider ?? null,
         input.model ?? null, input.campaignId ?? null, input.creativeId ?? null, input.idempotencyKey ?? null,
         JSON.stringify(input.meta ?? {})],
      );
      await client.query('COMMIT');
      return { txId: tx[0].id, balanceAfter: rows[0].after };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  // Éxito: marca la reserva como consumida (el saldo ya se descontó en reserve).
  async consume(txId: string | null): Promise<void> {
    if (!txId) return;
    await this.db.query(`UPDATE credit_transactions SET status = 'consumed' WHERE id = $1 AND status = 'reserved'`, [txId]);
  }

  // Error: devuelve los créditos y marca refund (idempotente: solo si estaba 'reserved').
  async release(txId: string | null, reason = 'error'): Promise<void> {
    if (!txId) return;
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE credit_transactions SET status = 'refunded' WHERE id = $1 AND status = 'reserved'
         RETURNING user_id, amount`, [txId]);
      if (rows.length) {
        const amount = Math.abs(rows[0].amount);
        const { rows: u } = await client.query(
          `UPDATE users SET ai_credits = ai_credits + $2 WHERE id = $1 RETURNING ai_credits AS after, ai_credits - $2 AS before`,
          [rows[0].user_id, amount]);
        await client.query(
          `INSERT INTO credit_transactions (user_id, type, amount, status, balance_before, balance_after, meta)
           VALUES ($1,'refund',$2,'committed',$3,$4,$5)`,
          [rows[0].user_id, amount, u[0].before, u[0].after, JSON.stringify({ reason, of: txId })]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      this.logger.warn(`release falló: ${(e as any).message}`);
    } finally {
      client.release();
    }
  }

  // Alta de créditos (packs / suscripción / ajuste manual)
  async grant(userId: string, amount: number, type: TxType, meta: any = {}): Promise<number> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE users SET ai_credits = ai_credits + $2 WHERE id = $1 RETURNING ai_credits AS after, ai_credits - $2 AS before`,
        [userId, amount]);
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, amount, status, balance_before, balance_after, meta)
         VALUES ($1,$2,$3,'committed',$4,$5,$6)`,
        [userId, type, amount, rows[0].before, rows[0].after, JSON.stringify(meta)]);
      await client.query('COMMIT');
      return rows[0].after;
    } finally {
      client.release();
    }
  }

  async history(userId: string, limit = 50) {
    const { rows } = await this.db.query(
      `SELECT id, type, amount, status, balance_after, operation, created_at
       FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]);
    return rows;
  }
}
