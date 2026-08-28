-- ─────────────────────────────────────────────────────────────────────────────
-- AI Commerce Ads Suite — Seed inicial
-- CREDENCIALES ADMIN: admin@aicommerceads.com / AdminACA2026!#
-- ─────────────────────────────────────────────────────────────────────────────

-- Agregar columnas extra al schema si no existen
ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_permissions JSONB NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS impersonated_by UUID;

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  plan_scope  VARCHAR(20) DEFAULT NULL, -- null = all plans
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID REFERENCES users(id),
  subject     VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  target      VARCHAR(20) NOT NULL DEFAULT 'all',
  target_value VARCHAR(100),
  recipients  INTEGER NOT NULL DEFAULT 0,
  sent_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Custom roles table
CREATE TABLE IF NOT EXISTS custom_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  color       VARCHAR(20) DEFAULT '#7c5cfc',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── ADMIN USER ───────────────────────────────────────────────────────────────
-- Password: AdminACA2026!#  (bcrypt hash below)
INSERT INTO users (
  id, email, password_hash, full_name, role, status,
  email_verified, extra_permissions
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@aicommerceads.com',
  '$2b$12$/zOIHdrJdztMPDtNq9YJuu1/QCDq19Xr2xeL.E99ScfBEU4p3cpsW', -- AdminACA2026!#
  'Alan Ugarte — Admin',
  'admin',
  'active',
  TRUE,
  '["admin.access","admin.users","admin.billing","admin.system","admin.impersonate","admin.audit","admin.announcements","admin.feature_flags"]'
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'active',
  email_verified = TRUE,
  full_name = 'Alan Ugarte — Admin';

-- ─── FEATURE FLAGS ────────────────────────────────────────────────────────────
INSERT INTO feature_flags (name, description, enabled, plan_scope) VALUES
  ('ai_creative_generation',  'Generación de creativos con IA', TRUE, NULL),
  ('ai_copy_generation',      'Generación de copies publicitarios con IA', TRUE, NULL),
  ('ai_optimization',         'Optimización automática de campañas con IA', TRUE, 'growth'),
  ('ai_advanced',             'IA avanzada completa (análisis profundo)', TRUE, 'scale'),
  ('auto_daily_reports',      'Informes automáticos diarios a las 20:00', TRUE, NULL),
  ('meta_ads_publish',        'Publicación directa en Meta Ads API', TRUE, NULL),
  ('whatsapp_tracking',       'Tracking de conversaciones WhatsApp', TRUE, NULL),
  ('multi_meta_accounts',     'Múltiples cuentas Meta Ads', TRUE, 'growth'),
  ('campaign_duplication',    'Duplicar campañas existentes', TRUE, NULL),
  ('export_pdf_reports',      'Exportar reportes en PDF', TRUE, NULL),
  ('api_access',              'Acceso a la API REST de la plataforma', FALSE, 'scale'),
  ('white_label',             'White label / marca propia', FALSE, 'scale'),
  ('bulk_campaign_creation',  'Creación masiva de campañas', TRUE, 'growth'),
  ('maintenance_mode',        'Modo mantenimiento (bloquea acceso de clientes)', FALSE, NULL)
ON CONFLICT (name) DO NOTHING;

-- ─── SYSTEM SETTINGS ──────────────────────────────────────────────────────────
INSERT INTO system_settings (key, value, description) VALUES
  ('report_send_hour',    '20', 'Hora de envío de reportes diarios (0-23)'),
  ('max_file_size_mb',    '500', 'Tamaño máximo de archivos subidos (MB)'),
  ('rate_limit_per_hour', '1000', 'Máximo de requests por hora por usuario'),
  ('trial_days',          '7', 'Días de prueba gratis en nuevas suscripciones'),
  ('support_email',       '"soporte@aicommerceads.com"', 'Email de soporte'),
  ('company_name',        '"AI Commerce Ads Suite"', 'Nombre de la plataforma'),
  ('maintenance_message', '"La plataforma está en mantenimiento. Volvemos en breve."', 'Mensaje durante mantenimiento'),
  ('stripe_test_mode',    'true', 'Modo de prueba en Stripe (false = producción)')
ON CONFLICT (key) DO NOTHING;

-- ─── CUSTOM ROLES ─────────────────────────────────────────────────────────────
INSERT INTO custom_roles (name, display_name, description, permissions, color) VALUES
  ('admin', 'Administrador', 'Acceso total al sistema', '["*"]', '#ff4d6a'),
  ('manager', 'Manager', 'Gestión de usuarios y campañas', '["campaigns.*","users.manage","reports.*","admin.access"]', '#7c5cfc'),
  ('support', 'Soporte', 'Lectura y soporte a clientes', '["campaigns.read","reports.read","admin.access","admin.users"]', '#4da6ff'),
  ('client', 'Cliente', 'Usuario estándar de la plataforma', '["campaigns.*","creatives.*","reports.read","ai.*"]', '#00d68f'),
  ('subuser', 'Subusuario', 'Acceso limitado asignado por el cliente', '["campaigns.read","reports.read"]', '#ffb347')
ON CONFLICT (name) DO NOTHING;

-- ─── DEMO USERS (para testear) ────────────────────────────────────────────────
-- Password para todos los demo: Demo@2026!
INSERT INTO users (email, password_hash, full_name, role, status, email_verified) VALUES
  ('maria@ejemplo.com', '$2b$12$IlcH2X/tKBQUGSa5lDdoHuqxuTNNfpL1FccmsF6X7VUhqTLkeiBku', 'María González', 'client', 'active', TRUE),
  ('carlos@ejemplo.com', '$2b$12$IlcH2X/tKBQUGSa5lDdoHuqxuTNNfpL1FccmsF6X7VUhqTLkeiBku', 'Carlos Romero', 'client', 'active', TRUE),
  ('laura@ejemplo.com', '$2b$12$IlcH2X/tKBQUGSa5lDdoHuqxuTNNfpL1FccmsF6X7VUhqTLkeiBku', 'Laura Martínez', 'client', 'suspended', TRUE),
  ('diego@ejemplo.com', '$2b$12$IlcH2X/tKBQUGSa5lDdoHuqxuTNNfpL1FccmsF6X7VUhqTLkeiBku', 'Diego Fernández', 'client', 'active', TRUE),
  ('soporte@aicommerceads.com', '$2b$12$IlcH2X/tKBQUGSa5lDdoHuqxuTNNfpL1FccmsF6X7VUhqTLkeiBku', 'Equipo Soporte', 'client', 'active', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Asignar planes a los demo users
DO $$
DECLARE
  u_id UUID;
  p_starter UUID;
  p_growth UUID;
  p_scale UUID;
BEGIN
  SELECT id INTO p_starter FROM plans WHERE name = 'starter';
  SELECT id INTO p_growth FROM plans WHERE name = 'growth';
  SELECT id INTO p_scale FROM plans WHERE name = 'scale';

  SELECT id INTO u_id FROM users WHERE email = 'maria@ejemplo.com';
  INSERT INTO subscriptions (user_id, plan_id, status) VALUES (u_id, p_growth, 'active') ON CONFLICT DO NOTHING;

  SELECT id INTO u_id FROM users WHERE email = 'carlos@ejemplo.com';
  INSERT INTO subscriptions (user_id, plan_id, status) VALUES (u_id, p_scale, 'active') ON CONFLICT DO NOTHING;

  SELECT id INTO u_id FROM users WHERE email = 'laura@ejemplo.com';
  INSERT INTO subscriptions (user_id, plan_id, status) VALUES (u_id, p_starter, 'active') ON CONFLICT DO NOTHING;

  SELECT id INTO u_id FROM users WHERE email = 'diego@ejemplo.com';
  INSERT INTO subscriptions (user_id, plan_id, status) VALUES (u_id, p_growth, 'active') ON CONFLICT DO NOTHING;
END;
$$;

-- ─── LOG DE CREACIÓN ──────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, entity, payload) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'system.seed', 'database', '{"version":"1.0","seeded_at":"now()"}');
