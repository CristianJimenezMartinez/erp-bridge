-- Migration 005: Multi-license per organization and Stripe Session idempotency
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(100);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_licenses_stripe_session ON licenses(stripe_session_id);
