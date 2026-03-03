-- ============================================================
-- Annual Billing Support
-- Adds billing_period column to subscriptions table
-- for distinguishing monthly (recurring) vs annual (one-time) payments.
-- ============================================================

-- Add billing_period column with default 'monthly' for backward compatibility
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'annual'));

-- Partial index for cron: efficiently find expired annual subscriptions
CREATE INDEX IF NOT EXISTS idx_sub_annual_expiry
  ON subscriptions(current_period_end)
  WHERE billing_period = 'annual' AND status = 'active';
