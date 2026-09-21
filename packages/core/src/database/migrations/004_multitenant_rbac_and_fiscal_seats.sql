-- Migration 004: Multi-Tenant RBAC, Fiscal Seat Binding & Fleet Telemetry

-- 1. Ampliación de Organizations para Identidad Fiscal y Canal Reseller
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id VARCHAR(32);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reseller_id VARCHAR(64);

-- 2. Ampliación de Licencias para Blindaje del Puesto Adicional (99€) y Ciclo de Vida de Pago
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS seat_type VARCHAR(32) NOT NULL DEFAULT 'BASE';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS parent_license_id UUID REFERENCES licenses(id) ON DELETE SET NULL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS tax_id VARCHAR(32);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS billing_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_licenses_parent ON licenses(parent_license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_tax_id ON licenses(tax_id);
CREATE INDEX IF NOT EXISTS idx_licenses_seat_type ON licenses(seat_type);
CREATE INDEX IF NOT EXISTS idx_licenses_billing_status ON licenses(billing_status);

-- 3. Telemetría y Registro Central de Errores de la Flota
CREATE TABLE IF NOT EXISTS fleet_error_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        VARCHAR(64) REFERENCES agents(id) ON DELETE SET NULL,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  error_code      VARCHAR(64) NOT NULL,
  message         TEXT NOT NULL,
  details         JSONB,
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_error_org ON fleet_error_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_fleet_error_agent ON fleet_error_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_fleet_error_code ON fleet_error_events(error_code);
CREATE INDEX IF NOT EXISTS idx_fleet_error_created ON fleet_error_events(created_at DESC);
