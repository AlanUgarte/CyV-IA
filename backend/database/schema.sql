-- ─────────────────────────────────────────────────────────────────────────────
-- AI Commerce Ads Suite — Database Schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'client', 'subuser');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification', 'blocked');
CREATE TYPE plan_name AS ENUM ('starter', 'growth', 'scale');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'error', 'optimizing');
CREATE TYPE campaign_objective AS ENUM ('whatsapp', 'traffic', 'leads', 'conversions');
CREATE TYPE creative_status AS ENUM ('pending', 'generating', 'ready', 'published', 'archived');
CREATE TYPE creative_format AS ENUM ('1_1', '4_5', '9_16');
CREATE TYPE creative_type AS ENUM ('image', 'video', 'carousel');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'converted', 'lost');
CREATE TYPE report_type AS ENUM ('daily', 'weekly', 'monthly', 'on_demand');

-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 VARCHAR(255) UNIQUE NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  full_name             VARCHAR(255) NOT NULL,
  role                  user_role NOT NULL DEFAULT 'client',
  status                user_status NOT NULL DEFAULT 'pending_verification',
  avatar_url            TEXT,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token    VARCHAR(255),
  password_reset_token  VARCHAR(255),
  password_reset_at     TIMESTAMP WITH TIME ZONE,
  last_login_at         TIMESTAMP WITH TIME ZONE,
  extra_permissions     JSONB NOT NULL DEFAULT '[]',
  notes                 TEXT,
  blocked_reason        TEXT,
  suspended_reason      TEXT,
  impersonated_by       UUID,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ─── PLANS ────────────────────────────────────────────────────────────────────

CREATE TABLE plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                plan_name UNIQUE NOT NULL,
  display_name        VARCHAR(100) NOT NULL,
  price_usd_cents     INTEGER NOT NULL,
  stripe_price_id     VARCHAR(255),
  max_campaigns       INTEGER,        -- NULL = unlimited
  max_creatives       INTEGER,        -- NULL = unlimited
  max_meta_accounts   INTEGER NOT NULL DEFAULT 1,
  max_subusers        INTEGER NOT NULL DEFAULT 0,
  features            JSONB NOT NULL DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO plans (name, display_name, price_usd_cents, max_campaigns, max_creatives, max_meta_accounts, max_subusers, features) VALUES
  ('starter', 'Plan Starter', 4900, 20, 50,  1, 0, '["dashboard_basic","reports_auto","whatsapp_redirect"]'),
  ('growth',  'Plan Growth',  9900, NULL, NULL, 3, 2, '["dashboard_premium","reports_auto","whatsapp_redirect","ai_optimization","multi_meta"]'),
  ('scale',   'Plan Scale',   19900, NULL, NULL, 10, 10, '["dashboard_premium","reports_advanced","whatsapp_redirect","ai_optimization","multi_meta","priority_processing","api_access","white_label"]');

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                   UUID NOT NULL REFERENCES plans(id),
  status                    subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id    VARCHAR(255) UNIQUE,
  stripe_customer_id        VARCHAR(255),
  current_period_start      TIMESTAMP WITH TIME ZONE,
  current_period_end        TIMESTAMP WITH TIME ZONE,
  canceled_at               TIMESTAMP WITH TIME ZONE,
  trial_end                 TIMESTAMP WITH TIME ZONE,
  created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ─── META ACCOUNTS ────────────────────────────────────────────────────────────

CREATE TABLE meta_accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  meta_ad_account_id    VARCHAR(100) NOT NULL,
  meta_business_id      VARCHAR(100),
  meta_pixel_id         VARCHAR(100),
  meta_page_id          VARCHAR(100),
  instagram_account_id  VARCHAR(100),
  whatsapp_number       VARCHAR(50),
  access_token          TEXT NOT NULL,            -- encrypted in app layer
  token_expires_at      TIMESTAMP WITH TIME ZONE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meta_accounts_user ON meta_accounts(user_id);
CREATE UNIQUE INDEX idx_meta_accounts_ad_account ON meta_accounts(user_id, meta_ad_account_id);

-- ─── CAMPAIGNS ────────────────────────────────────────────────────────────────

CREATE TABLE campaigns (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meta_account_id       UUID REFERENCES meta_accounts(id) ON DELETE SET NULL,
  name                  VARCHAR(255) NOT NULL,
  status                campaign_status NOT NULL DEFAULT 'draft',
  objective             campaign_objective NOT NULL DEFAULT 'whatsapp',
  daily_budget_cents    INTEGER NOT NULL DEFAULT 2500,  -- $25 USD
  total_spent_cents     INTEGER NOT NULL DEFAULT 0,
  whatsapp_number       VARCHAR(50),
  whatsapp_message      TEXT,
  targeting             JSONB NOT NULL DEFAULT '{}',
  -- Meta IDs (set after publishing)
  meta_campaign_id      VARCHAR(100),
  meta_adset_id         VARCHAR(100),
  meta_ad_id            VARCHAR(100),
  -- AI analysis results
  ai_hook               TEXT,
  ai_copy_headline      TEXT,
  ai_copy_body          TEXT,
  ai_copy_cta           TEXT,
  ai_audience_notes     TEXT,
  -- Metrics (synced from Meta)
  impressions           BIGINT NOT NULL DEFAULT 0,
  clicks                BIGINT NOT NULL DEFAULT 0,
  ctr                   DECIMAL(6,4) NOT NULL DEFAULT 0,
  cpc_cents             INTEGER NOT NULL DEFAULT 0,
  cpm_cents             INTEGER NOT NULL DEFAULT 0,
  leads                 INTEGER NOT NULL DEFAULT 0,
  roas                  DECIMAL(6,2) NOT NULL DEFAULT 0,
  metrics_updated_at    TIMESTAMP WITH TIME ZONE,
  published_at          TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_meta ON campaigns(meta_campaign_id);

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price_cents   INTEGER,
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  media_urls    JSONB NOT NULL DEFAULT '[]',  -- array of {url, type, format}
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_campaign ON products(campaign_id);

-- ─── CREATIVES ────────────────────────────────────────────────────────────────

CREATE TABLE creatives (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  status          creative_status NOT NULL DEFAULT 'pending',
  type            creative_type NOT NULL DEFAULT 'video',
  format          creative_format NOT NULL DEFAULT '9_16',
  source_url      TEXT,   -- original uploaded file
  output_url      TEXT,   -- AI-processed output
  thumbnail_url   TEXT,
  duration_secs   INTEGER,
  file_size_bytes BIGINT,
  ai_prompt       TEXT,
  ai_style_notes  TEXT,
  -- Performance (when linked to a campaign)
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  ctr             DECIMAL(6,4) NOT NULL DEFAULT 0,
  meta_creative_id VARCHAR(100),
  error_message   TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creatives_user ON creatives(user_id);
CREATE INDEX idx_creatives_campaign ON creatives(campaign_id);
CREATE INDEX idx_creatives_status ON creatives(status);

-- ─── LEADS ────────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  whatsapp_number VARCHAR(50),
  name            VARCHAR(255),
  status          lead_status NOT NULL DEFAULT 'new',
  notes           TEXT,
  meta_lead_id    VARCHAR(100),
  source          VARCHAR(100),
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),
  first_contact_at TIMESTAMP WITH TIME ZONE,
  converted_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_whatsapp ON leads(whatsapp_number);

-- ─── REPORTS ──────────────────────────────────────────────────────────────────

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            report_type NOT NULL DEFAULT 'daily',
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  summary         JSONB NOT NULL DEFAULT '{}',
  insights        JSONB NOT NULL DEFAULT '[]',   -- array of AI-generated insights
  recommendations JSONB NOT NULL DEFAULT '[]',   -- array of actions
  pdf_url         TEXT,
  email_sent_at   TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_period ON reports(period_start, period_end);

-- ─── AUDIT LOG ────────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(100),
  entity_id   UUID,
  payload     JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ─── REFRESH TOKENS ───────────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ─── FEATURE FLAGS ───────────────────────────────────────────────────────────

CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  plan_scope  VARCHAR(20) DEFAULT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

CREATE TABLE announcements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID REFERENCES users(id),
  subject      VARCHAR(255) NOT NULL,
  body         TEXT NOT NULL,
  target       VARCHAR(20) NOT NULL DEFAULT 'all',
  target_value VARCHAR(100),
  recipients   INTEGER NOT NULL DEFAULT 0,
  sent_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── CUSTOM ROLES ─────────────────────────────────────────────────────────────

CREATE TABLE custom_roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description  TEXT,
  permissions  JSONB NOT NULL DEFAULT '[]',
  color        VARCHAR(20) DEFAULT '#7c5cfc',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── SYSTEM SETTINGS ──────────────────────────────────────────────────────────

CREATE TABLE system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── TRIGGERS: updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','plans','subscriptions','meta_accounts','campaigns','products','creatives','leads','feature_flags','custom_roles']
  LOOP
    EXECUTE FORMAT('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END;
$$;
