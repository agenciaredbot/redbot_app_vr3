-- Add theme mode and light logo columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS logo_light_url TEXT;
