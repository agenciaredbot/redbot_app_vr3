-- ============================================================
-- REDBOT.APP — Mercado Pago Migration
-- Add 'mercadopago' as payment provider + subscription ID column
-- ============================================================

-- Update CHECK constraints to include 'mercadopago'
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_payment_provider_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_payment_provider_check
  CHECK (payment_provider IN ('wompi', 'stripe', 'mercadopago'));

ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_provider_check;
ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_provider_check
  CHECK (provider IN ('wompi', 'stripe', 'mercadopago'));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider IN ('wompi', 'stripe', 'mercadopago'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_provider_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_provider_check
  CHECK (provider IN ('wompi', 'stripe', 'mercadopago'));

-- Add provider_subscription_id to subscriptions table
-- Stores Mercado Pago preapproval ID (or Stripe subscription ID in the future)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sub_provider_sub_id
  ON subscriptions(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
