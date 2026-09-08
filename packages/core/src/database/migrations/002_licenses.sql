-- Migration 002: Licensing Tables

CREATE TABLE IF NOT EXISTS licenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           VARCHAR(30) UNIQUE NOT NULL,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alias         VARCHAR(100),
  plan          VARCHAR(20) NOT NULL DEFAULT 'starter',
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  max_activations INTEGER NOT NULL DEFAULT 1,
  current_activations INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  revoked_reason TEXT
);

ALTER TABLE licenses ADD COLUMN IF NOT EXISTS alias VARCHAR(100);

CREATE TABLE IF NOT EXISTS license_activations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id    UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  hwid          VARCHAR(64) NOT NULL,
  agent_id      VARCHAR(64) REFERENCES agents(id) ON DELETE SET NULL,
  machine_info  JSONB,
  activated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_validated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMPTZ,
  UNIQUE(license_id, hwid)
);

CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(key);
CREATE INDEX IF NOT EXISTS idx_licenses_org ON licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_license_activations_hwid ON license_activations(hwid);
CREATE INDEX IF NOT EXISTS idx_license_activations_license ON license_activations(license_id);
