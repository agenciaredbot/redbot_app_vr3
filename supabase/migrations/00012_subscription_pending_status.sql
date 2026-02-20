-- ============================================================
-- REDBOT.APP — Add 'pending' status to subscriptions
-- Required for hosted checkout flow (MP redirect)
-- Subscription starts as 'pending' until user completes payment on MP
-- ============================================================

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
