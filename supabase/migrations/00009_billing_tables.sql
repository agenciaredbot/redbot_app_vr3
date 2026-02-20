-- ============================================================
-- REDBOT.APP — Billing System Tables
-- Supports Wompi (Colombia, COP) + future Stripe (USD)
-- ============================================================

-- ============================================================
-- ALTER ORGANIZATIONS — Add payment provider field
-- ============================================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payment_provider TEXT CHECK (payment_provider IN ('wompi', 'stripe')),
  ADD COLUMN IF NOT EXISTS payment_provider_customer_id TEXT;

-- Index for provider customer lookups
CREATE INDEX IF NOT EXISTS idx_org_payment_provider_customer
  ON organizations(payment_provider, payment_provider_customer_id)
  WHERE payment_provider IS NOT NULL;

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (provider IN ('wompi', 'stripe')),
  provider_payment_source_id TEXT NOT NULL, -- Wompi payment source ID or Stripe payment method ID
  type TEXT NOT NULL CHECK (type IN ('card', 'nequi')),

  -- Card display info (never store full numbers)
  last_four TEXT,
  brand TEXT, -- visa, mastercard, amex, etc.

  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pm_org ON payment_methods(organization_id);
CREATE INDEX idx_pm_provider ON payment_methods(provider, provider_payment_source_id);

-- Ensure only one default per org
CREATE UNIQUE INDEX idx_pm_default_per_org
  ON payment_methods(organization_id)
  WHERE is_default = TRUE AND status = 'active';

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (provider IN ('wompi', 'stripe')),
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'power', 'omni')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

  -- Trial
  trial_ends_at TIMESTAMPTZ,

  -- Retry logic for failed payments
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,

  -- Pricing
  amount_cents INTEGER NOT NULL, -- in smallest currency unit (centavos COP or cents USD)
  currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active subscription per org (allow canceled ones to coexist)
CREATE UNIQUE INDEX idx_sub_org_active
  ON subscriptions(organization_id)
  WHERE status NOT IN ('canceled');

CREATE INDEX idx_sub_status ON subscriptions(status);
CREATE INDEX idx_sub_period_end ON subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX idx_sub_retry ON subscriptions(next_retry_at) WHERE status = 'past_due' AND retry_count < 3;
CREATE INDEX idx_sub_trial ON subscriptions(trial_ends_at) WHERE status = 'trialing';

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (provider IN ('wompi', 'stripe')),
  provider_transaction_id TEXT, -- Wompi transaction ID or Stripe invoice ID (unique per provider)

  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),

  -- Period this invoice covers
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inv_org ON invoices(organization_id);
CREATE INDEX idx_inv_sub ON invoices(subscription_id);
CREATE INDEX idx_inv_status ON invoices(status);
CREATE UNIQUE INDEX idx_inv_provider_tx
  ON invoices(provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Payment Methods: org admins can manage, agents can view
CREATE POLICY pm_select ON payment_methods FOR SELECT USING (
  organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
);
CREATE POLICY pm_insert ON payment_methods FOR INSERT WITH CHECK (
  organization_id = get_user_org_id() AND get_user_role() IN ('org_admin', 'super_admin')
);
CREATE POLICY pm_update ON payment_methods FOR UPDATE USING (
  organization_id = get_user_org_id() AND get_user_role() IN ('org_admin', 'super_admin')
);
CREATE POLICY pm_delete ON payment_methods FOR DELETE USING (
  organization_id = get_user_org_id() AND get_user_role() IN ('org_admin', 'super_admin')
);

-- Subscriptions: all org members can view, only system modifies
CREATE POLICY sub_select ON subscriptions FOR SELECT USING (
  organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
);
-- Insert/update only via service role (admin client)

-- Invoices: all org members can view
CREATE POLICY inv_select ON invoices FOR SELECT USING (
  organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
);
-- Insert/update only via service role (admin client)

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
