-- Super Admin enhancements
-- Adds is_active column to organizations for soft-disable
-- Adds RLS policies for super_admin cross-org operations

-- 1. Add is_active to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_org_active ON organizations(is_active);

-- 2. Super admin can UPDATE any organization
DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations FOR UPDATE USING (
  (id = get_user_org_id() AND get_user_role() IN ('org_admin', 'super_admin'))
  OR get_user_role() = 'super_admin'
);

-- 3. Super admin can DELETE organizations
DROP POLICY IF EXISTS org_delete ON organizations;
CREATE POLICY org_delete ON organizations FOR DELETE USING (
  get_user_role() = 'super_admin'
);

-- 4. Super admin can UPDATE any user profile
DROP POLICY IF EXISTS user_update ON user_profiles;
CREATE POLICY user_update ON user_profiles FOR UPDATE USING (
  id = auth.uid()
  OR (organization_id = get_user_org_id() AND get_user_role() = 'org_admin')
  OR get_user_role() = 'super_admin'
);

-- 5. Super admin can DELETE user profiles
DROP POLICY IF EXISTS user_delete ON user_profiles;
CREATE POLICY user_delete ON user_profiles FOR DELETE USING (
  get_user_role() = 'super_admin'
  OR (organization_id = get_user_org_id() AND get_user_role() = 'org_admin')
);
