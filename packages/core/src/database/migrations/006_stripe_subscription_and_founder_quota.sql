-- Migration 006: Stripe Subscription ID tracking and Founder upgrade quota enforcement
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS upgraded_from_key VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_licenses_stripe_subscription ON licenses(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_licenses_upgraded_from_key ON licenses(upgraded_from_key);
