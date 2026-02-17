-- Add favicon_url column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url TEXT;
