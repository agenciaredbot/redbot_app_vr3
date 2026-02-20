-- Migration: Add RPC function for atomic conversation counter increment
-- Used by feature-gate.ts to safely increment conversations_used_this_month

CREATE OR REPLACE FUNCTION increment_conversations_used(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE organizations
  SET conversations_used_this_month = conversations_used_this_month + 1
  WHERE id = org_id;
END;
$$;

-- Grant execute to authenticated users (RLS on the function level)
GRANT EXECUTE ON FUNCTION increment_conversations_used(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_conversations_used(UUID) TO service_role;
