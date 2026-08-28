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
