-- Migration: Add toggle for new lead email notifications per organization
-- Default TRUE so existing orgs keep receiving emails as before.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS notify_new_leads BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN organizations.notify_new_leads IS
  'When false, the platform will NOT send email notifications to org admins when a new lead is created.';
