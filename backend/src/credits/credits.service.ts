import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { StorageService } from '../uploads/storage.service';
import { CREDIT_PACKS } from '../config/plans.config';

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
  constructor(
    @Inject(DATABASE_POOL) private readonly db: Pool,
    private readonly storage: StorageService,
  ) {}

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

  // ── Recargas por transferencia (el CEO aprueba) ─────────────────────────────
  async createTopup(userId: string, packKey: string, receiptBase64?: string) {
    const pack = CREDIT_PACKS.find(p => p.key === packKey);
    if (!pack) throw new BadRequestException('Pack inválido');
    // Guardamos el comprobante EN LA DB (el disco de Railway se borra en cada deploy).
    // Si hay S3/R2 configurado, además subimos una copia (best-effort).
    let receiptUrl: string | null = null;
    if (receiptBase64) {
      const m = receiptBase64.match(/^data:(.+?);base64,(.*)$/);
      if (m) {
        try {
          const ext = m[1].includes('pdf') ? 'pdf' : m[1].includes('png') ? 'png' : 'jpg';
          const saved = await this.storage.save(Buffer.from(m[2], 'base64'), `receipt_${Date.now()}.${ext}`, m[1]);
          if (saved.url && !saved.url.includes('localhost')) receiptUrl = saved.url;
        } catch { /* la DB es la fuente confiable */ }
      }
    }
    const { rows } = await this.db.query(
      `INSERT INTO credit_purchases (user_id, pack_key, credits, amount_usd, receipt_url, receipt_data, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       RETURNING id, pack_key, credits, amount_usd, receipt_url, status, created_at`,
      [userId, pack.key, pack.credits, pack.priceUsd, receiptUrl, receiptBase64 ?? null]);
    return rows[0];
  }

  async listUserTopups(userId: string) {
    const { rows } = await this.db.query(
      `SELECT id, pack_key, credits, amount_usd, status, created_at, (receipt_data IS NOT NULL OR receipt_url IS NOT NULL) AS has_receipt
       FROM credit_purchases WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [userId]);
    return rows;
  }

  async listPendingTopups() {
    const { rows } = await this.db.query(
      `SELECT cp.id, cp.pack_key, cp.credits, cp.amount_usd, cp.receipt_url, cp.status, cp.created_at,
              (cp.receipt_data IS NOT NULL OR cp.receipt_url IS NOT NULL) AS has_receipt,
              u.email, u.full_name
       FROM credit_purchases cp JOIN users u ON u.id = cp.user_id
       WHERE cp.status = 'pending' ORDER BY cp.created_at ASC`);
    return rows;
  }

  // Devuelve el comprobante (data URL) para el visor del admin
  async getReceipt(id: string): Promise<{ dataUrl: string | null; url: string | null }> {
    const { rows } = await this.db.query('SELECT receipt_data, receipt_url FROM credit_purchases WHERE id = $1', [id]);
    if (!rows.length) throw new BadRequestException('No encontrado');
    return { dataUrl: rows[0].receipt_data ?? null, url: rows[0].receipt_url ?? null };
  }

  // Aprobar: acredita créditos y marca la solicitud (idempotente: solo si pending)
  async approveTopup(id: string, adminId: string) {
    const { rows } = await this.db.query(
      `UPDATE credit_purchases SET status='approved', reviewed_by=$2, reviewed_at=NOW()
       WHERE id=$1 AND status='pending' RETURNING user_id, credits, pack_key`, [id, adminId]);
    if (!rows.length) throw new BadRequestException('Solicitud no encontrada o ya procesada');
    const after = await this.grant(rows[0].user_id, rows[0].credits, 'purchase', { topup: id, pack: rows[0].pack_key, approvedBy: adminId });
    return { ok: true, credited: rows[0].credits, balance: after };
  }

  async rejectTopup(id: string, adminId: string, note?: string) {
    const { rows } = await this.db.query(
      `UPDATE credit_purchases SET status='rejected', reviewed_by=$2, reviewed_at=NOW(), note=$3
       WHERE id=$1 AND status='pending' RETURNING id`, [id, adminId, note ?? null]);
    if (!rows.length) throw new BadRequestException('Solicitud no encontrada o ya procesada');
    return { ok: true };
  }
}
