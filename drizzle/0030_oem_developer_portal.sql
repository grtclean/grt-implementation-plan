-- OEM Developer Portal & B2B Open Gateway
-- Migration: 0030_oem_developer_portal.sql

-- ── Enums ──

DO $$ BEGIN
  CREATE TYPE oem_key_status AS ENUM ('active', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE oem_webhook_status AS ENUM ('active', 'paused', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE oem_delivery_status AS ENUM ('pending', 'delivered', 'failed', 'retrying');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table 1: oem_api_keys ──

CREATE TABLE IF NOT EXISTS oem_api_keys (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  key_name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(128) NOT NULL UNIQUE,
  key_prefix VARCHAR(12) NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]',
  status oem_key_status NOT NULL DEFAULT 'active',
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by INTEGER,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oem_keys_client ON oem_api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_oem_keys_hash ON oem_api_keys(key_hash);

-- ── Table 2: oem_webhooks ──

CREATE TABLE IF NOT EXISTS oem_webhooks (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  endpoint_url VARCHAR(500) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret_hash VARCHAR(128) NOT NULL,
  secret_prefix VARCHAR(12) NOT NULL,
  status oem_webhook_status NOT NULL DEFAULT 'active',
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oem_webhooks_client ON oem_webhooks(client_id);
CREATE INDEX IF NOT EXISTS idx_oem_webhooks_status ON oem_webhooks(status);

-- ── Table 3: oem_api_call_logs ──

CREATE TABLE IF NOT EXISTS oem_api_call_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER,
  client_id INTEGER NOT NULL,
  endpoint VARCHAR(200) NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'GET',
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address VARCHAR(45),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oem_calls_client_created ON oem_api_call_logs(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_oem_calls_key ON oem_api_call_logs(api_key_id);

-- ── Table 4: oem_webhook_deliveries ──

CREATE TABLE IF NOT EXISTS oem_webhook_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status oem_delivery_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  status_code INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oem_deliveries_status ON oem_webhook_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_oem_deliveries_webhook ON oem_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_oem_deliveries_client ON oem_webhook_deliveries(client_id);
