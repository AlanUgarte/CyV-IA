import { CreditsService } from './credits.service';

// Fake Pool en memoria: interpreta las queries que usa CreditsService.
function makeFakePool(startCredits: number) {
  const state = { credits: startCredits, txs: [] as any[], seq: 1 };
  const run = async (sql: string, params: any[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql.trim())) return { rows: [] };
    if (sql.includes('SELECT ai_credits FROM users')) return { rows: [{ ai_credits: state.credits }] };
    if (sql.includes('SELECT id, balance_after FROM credit_transactions WHERE idempotency_key')) {
      const t = state.txs.find(x => x.idempotency_key === params[0]);
      return { rows: t ? [{ id: t.id, balance_after: t.balance_after }] : [] };
    }
    if (sql.includes('UPDATE users SET ai_credits = ai_credits - $2')) {
      const amount = params[1];
      if (state.credits < amount) return { rows: [] };
      const before = state.credits; state.credits -= amount;
      return { rows: [{ after: state.credits, before }] };
    }
    if (sql.includes('UPDATE users SET ai_credits = ai_credits + $2')) {
      const amount = params[1]; const before = state.credits; state.credits += amount;
      return { rows: [{ after: state.credits, before }] };
    }
    if (sql.includes('INSERT INTO credit_transactions') && sql.includes("'reserved'")) {
      const id = `tx_${state.seq++}`;
      state.txs.push({ id, user_id: params[0], amount: params[1], status: 'reserved', balance_after: params[3], idempotency_key: params[9] });
      return { rows: [{ id }] };
    }
    if (sql.includes('INSERT INTO credit_transactions')) { state.txs.push({ id: `tx_${state.seq++}` }); return { rows: [{ id: `tx_${state.seq}` }] }; }
    if (sql.includes("UPDATE credit_transactions SET status = 'consumed'")) {
      const t = state.txs.find(x => x.id === params[0] && x.status === 'reserved'); if (t) t.status = 'consumed';
      return { rows: t ? [{}] : [] };
    }
    if (sql.includes("UPDATE credit_transactions SET status = 'refunded'")) {
      const t = state.txs.find(x => x.id === params[0] && x.status === 'reserved');
      if (t) { t.status = 'refunded'; return { rows: [{ user_id: t.user_id, amount: t.amount }] }; }
      return { rows: [] };
    }
    return { rows: [] };
  };
  const pool: any = { query: run, connect: async () => ({ query: run, release: () => {} }), _state: state };
  return pool;
}

describe('CreditsService (ledger)', () => {
  it('reserva descuenta el saldo y crea la transacción', async () => {
    const pool = makeFakePool(100);
    const svc = new CreditsService(pool, {} as any);
    const { txId, balanceAfter } = await svc.reserve({ userId: 'u1', role: 'client', amount: 5 });
    expect(txId).toBeTruthy();
    expect(balanceAfter).toBe(95);
    expect(pool._state.credits).toBe(95);
  });

  it('nunca deja saldo negativo (SIN_CREDITOS)', async () => {
    const pool = makeFakePool(3);
    const svc = new CreditsService(pool, {} as any);
    await expect(svc.reserve({ userId: 'u1', role: 'client', amount: 5 })).rejects.toThrow('SIN_CREDITOS');
    expect(pool._state.credits).toBe(3); // sin cambios
  });

  it('idempotencia: misma key no cobra dos veces', async () => {
    const pool = makeFakePool(100);
    const svc = new CreditsService(pool, {} as any);
    const a = await svc.reserve({ userId: 'u1', role: 'client', amount: 10, idempotencyKey: 'k1' });
    const b = await svc.reserve({ userId: 'u1', role: 'client', amount: 10, idempotencyKey: 'k1' });
    expect(a.txId).toBe(b.txId);
    expect(pool._state.credits).toBe(90); // descontó una sola vez
  });

  it('admin no consume créditos (bypass)', async () => {
    const pool = makeFakePool(100);
    const svc = new CreditsService(pool, {} as any);
    const { txId } = await svc.reserve({ userId: 'admin', role: 'admin', amount: 50 });
    expect(txId).toBeNull();
    expect(pool._state.credits).toBe(100);
  });

  it('release devuelve los créditos ante un error', async () => {
    const pool = makeFakePool(100);
    const svc = new CreditsService(pool, {} as any);
    const { txId } = await svc.reserve({ userId: 'u1', role: 'client', amount: 20 });
    expect(pool._state.credits).toBe(80);
    await svc.release(txId, 'gen_error');
    expect(pool._state.credits).toBe(100); // reembolsado
  });

  it('consume marca la reserva sin tocar el saldo (ya descontado)', async () => {
    const pool = makeFakePool(100);
    const svc = new CreditsService(pool, {} as any);
    const { txId } = await svc.reserve({ userId: 'u1', role: 'client', amount: 7 });
    await svc.consume(txId);
    expect(pool._state.credits).toBe(93);
    const tx = pool._state.txs.find((t: any) => t.id === txId);
    expect(tx.status).toBe('consumed');
  });
});
