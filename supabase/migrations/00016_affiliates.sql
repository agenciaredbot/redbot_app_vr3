-- ============================================================
-- Migration 00016: Affiliate System
-- ============================================================
-- Native affiliate/referral system for Redbot.
-- Supports both external affiliates and existing tenant referrals.
-- Commission is recurring monthly, calculated on each payment webhook.
-- ============================================================

-- 1. Commission rates (configurable per plan)
CREATE TABLE affiliate_commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'power', 'omni')),
  commission_percent NUMERIC(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rate_tier_active ON affiliate_commission_rates(plan_tier) WHERE is_active = TRUE;

INSERT INTO affiliate_commission_rates (plan_tier, commission_percent) VALUES
  ('basic', 10.00),
  ('power', 15.00),
  ('omni', 20.00);

-- 2. Affiliates
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  affiliate_type TEXT NOT NULL DEFAULT 'external' CHECK (affiliate_type IN ('external', 'tenant')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  payout_method TEXT CHECK (payout_method IN ('nequi', 'bank_transfer', 'other')),
  payout_details JSONB DEFAULT '{}',
  -- Denormalized stats
  total_referrals INTEGER NOT NULL DEFAULT 0,
  active_referrals INTEGER NOT NULL DEFAULT 0,
  total_earned_cents BIGINT NOT NULL DEFAULT 0,
  total_paid_cents BIGINT NOT NULL DEFAULT 0,
  pending_balance_cents BIGINT NOT NULL DEFAULT 0,
  -- Admin
  notes TEXT,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_affiliate_user ON affiliates(user_id);
CREATE INDEX idx_affiliate_status ON affiliates(status);
CREATE INDEX idx_affiliate_type ON affiliates(affiliate_type);
CREATE INDEX idx_affiliate_org ON affiliates(organization_id) WHERE organization_id IS NOT NULL;

-- 3. Referrals (which org was referred by which affiliate)
CREATE TABLE affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'churned', 'cancelled')),
  referral_code_used TEXT NOT NULL,
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  referred_plan_tier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ref_org ON affiliate_referrals(referred_org_id);
CREATE INDEX idx_ref_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX idx_ref_status ON affiliate_referrals(status);

-- 4. Payouts (must be created before commissions due to FK)
CREATE TABLE affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'COP',
  payout_method TEXT NOT NULL,
  payout_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_by UUID REFERENCES user_profiles(id),
  processed_at TIMESTAMPTZ,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX idx_payout_status ON affiliate_payouts(status);

-- 5. Commissions (per-payment commission records)
CREATE TABLE affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES affiliate_referrals(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  plan_tier TEXT NOT NULL,
  commission_rate_percent NUMERIC(5,2) NOT NULL,
  base_amount_cents BIGINT NOT NULL,
  commission_amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payout_id UUID REFERENCES affiliate_payouts(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comm_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX idx_comm_referral ON affiliate_commissions(referral_id);
CREATE INDEX idx_comm_status ON affiliate_commissions(status);
CREATE INDEX idx_comm_invoice ON affiliate_commissions(invoice_id);
CREATE INDEX idx_comm_payout ON affiliate_commissions(payout_id) WHERE payout_id IS NOT NULL;

-- 6. ALTER organizations: add referred_by column
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS referred_by_affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_referred_by ON organizations(referred_by_affiliate_id)
  WHERE referred_by_affiliate_id IS NOT NULL;

-- 7. ALTER user_profiles: expand role CHECK to include 'affiliate'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('super_admin', 'org_admin', 'org_agent', 'affiliate'));

-- 8. RLS Policies
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commission_rates ENABLE ROW LEVEL SECURITY;

-- Affiliates: own record + super_admin
CREATE POLICY aff_select ON affiliates FOR SELECT USING (
  user_id = auth.uid() OR get_user_role() = 'super_admin'
);

-- Referrals: own affiliate's referrals + super_admin
CREATE POLICY ref_select ON affiliate_referrals FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  OR get_user_role() = 'super_admin'
);

-- Commissions: own affiliate's commissions + super_admin
CREATE POLICY comm_select ON affiliate_commissions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  OR get_user_role() = 'super_admin'
);

-- Payouts: own affiliate's payouts + super_admin
CREATE POLICY pay_select ON affiliate_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  OR get_user_role() = 'super_admin'
);

-- Commission rates: public read (shown on affiliate signup page)
CREATE POLICY rate_select ON affiliate_commission_rates FOR SELECT USING (TRUE);

-- 9. Triggers for updated_at
CREATE TRIGGER affiliates_updated_at BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER affiliate_referrals_updated_at BEFORE UPDATE ON affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER affiliate_payouts_updated_at BEFORE UPDATE ON affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER affiliate_commission_rates_updated_at BEFORE UPDATE ON affiliate_commission_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. RPCs for atomic counter updates
CREATE OR REPLACE FUNCTION increment_affiliate_referrals(aff_id UUID)
RETURNS VOID AS $$
  UPDATE affiliates SET total_referrals = total_referrals + 1 WHERE id = aff_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_affiliate_active_referrals(aff_id UUID)
RETURNS VOID AS $$
  UPDATE affiliates SET active_referrals = active_referrals + 1 WHERE id = aff_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_affiliate_balance(aff_id UUID, amount BIGINT)
RETURNS VOID AS $$
  UPDATE affiliates
  SET total_earned_cents = total_earned_cents + amount,
      pending_balance_cents = pending_balance_cents + amount
  WHERE id = aff_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION deduct_affiliate_balance(aff_id UUID, amount BIGINT)
RETURNS VOID AS $$
  UPDATE affiliates
  SET total_paid_cents = total_paid_cents + amount,
      pending_balance_cents = pending_balance_cents - amount
  WHERE id = aff_id;
$$ LANGUAGE sql SECURITY DEFINER;
