-- ============================================================
-- Migration: Add "lite" plan tier + update existing plan limits
-- ============================================================

-- 1. Update organizations table CHECK constraint to include 'lite'
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_tier_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_tier_check
  CHECK (plan_tier IN ('lite', 'basic', 'power', 'omni'));

-- 2. Update subscriptions table CHECK constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_tier_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_tier_check
  CHECK (plan_tier IN ('lite', 'basic', 'power', 'omni'));

-- 3. Update affiliate_commission_rates CHECK constraint
ALTER TABLE affiliate_commission_rates DROP CONSTRAINT IF EXISTS affiliate_commission_rates_plan_tier_check;
ALTER TABLE affiliate_commission_rates ADD CONSTRAINT affiliate_commission_rates_plan_tier_check
  CHECK (plan_tier IN ('lite', 'basic', 'power', 'omni'));

-- 4. Insert default lite commission rate
INSERT INTO affiliate_commission_rates (plan_tier, commission_percent)
VALUES ('lite', 10.00)
ON CONFLICT DO NOTHING;

-- 5. Update existing basic (Starter) orgs to new limits:
--    properties: 50 → unlimited (-1), agents: 2 → 4, conversations: 100 → 200
UPDATE organizations
SET
  max_properties = -1,
  max_agents = 4,
  max_conversations_per_month = 200
WHERE plan_tier = 'basic'
  AND plan_status IN ('active', 'trialing');

-- 6. Update existing power orgs to new limits:
--    properties: 200 → unlimited (-1), agents: 5 → 8, conversations: 500 → 750
UPDATE organizations
SET
  max_properties = -1,
  max_agents = 8,
  max_conversations_per_month = 750
WHERE plan_tier = 'power'
  AND plan_status IN ('active', 'trialing');
