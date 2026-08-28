import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function ensureNewTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'connected',
      connected_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, type)
    );
  `);

  // AI Creative Studio: créditos por usuario + campos del studio en creatives
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 100`);
  await pool.query(`ALTER TABLE creatives ADD COLUMN IF NOT EXISTS video_url TEXT`);
  await pool.query(`ALTER TABLE creatives ADD COLUMN IF NOT EXISTS studio JSONB NOT NULL DEFAULT '{}'`);
  await pool.query(`ALTER TABLE creatives ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0`);

  // Ledger de créditos (reserva/consumo/refund) con idempotencia
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      amount INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'committed',
      balance_before INTEGER, balance_after INTEGER,
      operation VARCHAR(40), provider VARCHAR(40), model VARCHAR(60),
      campaign_id UUID, creative_id UUID,
      idempotency_key VARCHAR(120),
      meta JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_tx_idem ON credit_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);
  `);

  // Cost tracking (costo real del proveedor — solo admin)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_generations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id UUID, creative_id UUID,
      provider VARCHAR(40) NOT NULL, model VARCHAR(60) NOT NULL, operation VARCHAR(40) NOT NULL,
      duration_secs INTEGER, resolution VARCHAR(20),
      estimated_provider_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
      credits_reserved INTEGER NOT NULL DEFAULT 0, credits_consumed INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL, error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_gen_user ON ai_generations(user_id, created_at DESC);
  `);

  // CEO / admin owner — idempotent, kept in sync on every boot
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role, status, email_verified)
    VALUES ('ugartealan776@gmail.com',
            '$2b$12$PzDOgJzOl2hB1g6uaZlDSOcNK4OHMiTaFVFb.51kxjHQTmLIdWfPq',
            'Alan Ugarte - CEO', 'admin', 'active', TRUE)
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          role = 'admin', status = 'active', email_verified = TRUE
  `);
}

export async function autoMigrate(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('⚠️  No DATABASE_URL — skipping auto-migrate');
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Check if DB is already migrated
    const { rows } = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1
    `);

    if (rows.length > 0) {
      // DB already migrated — patch admin hash + ensure new tables exist
      await pool.query(`
        UPDATE users SET password_hash = '$2a$12$XSsoBhGBomdNSB8i9yymvO3x0F.L2OxfUnEJYoYRnckZtZcpVR5LO'
        WHERE email = 'admin@aicommerceads.com'
      `);
      await ensureNewTables(pool);
      console.log('✅ Admin password hash verified');
      return;
    }

    console.log('🔄 Running database migrations...');

    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Schema applied');

    const seedPath = join(__dirname, 'seed.sql');
    const seed = readFileSync(seedPath, 'utf8');
    await pool.query(seed);
    console.log('✅ Seed applied — admin: admin@aicommerceads.com / AdminACA2026!#');

    // Fix admin password hash to ensure login works
    await pool.query(`
      UPDATE users SET password_hash = '$2a$12$XSsoBhGBomdNSB8i9yymvO3x0F.L2OxfUnEJYoYRnckZtZcpVR5LO'
      WHERE email = 'admin@aicommerceads.com'
    `);
    console.log('✅ Admin password hash updated');

    await ensureNewTables(pool);
    console.log('✅ Extended tables created');

  } catch (err: any) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await pool.end();
  }
}
