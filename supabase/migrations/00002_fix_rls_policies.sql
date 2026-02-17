-- ============================================================
-- FIX PERMISSIVE RLS POLICIES
-- Migration: 00002_fix_rls_policies.sql
--
-- Fixes:
-- 1. organizations SELECT: Remove OR TRUE, allow public slug lookup safely
-- 2. leads INSERT: Scope to org_id (chat/tenant uses adminClient which bypasses RLS)
-- 3. lead_tags INSERT: Verify lead belongs to user's org
-- 4. conversations INSERT: Scope to org_id (chat uses adminClient)
-- 5. messages INSERT: Verify conversation belongs to user's org
-- 6. audit_logs INSERT: Scope to org_id
-- ============================================================

-- 1. Fix organizations SELECT
-- The OR TRUE was for public tenant slug lookups, but those go through
-- adminClient (service_role) which bypasses RLS anyway.
-- Authenticated users should only see their own org (or all if super_admin).
DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations FOR SELECT USING (
  id = get_user_org_id()
  OR get_user_role() = 'super_admin'
);

-- 2. Fix leads INSERT — require org_id matches user's org
-- Note: Chat widget creates leads via adminClient (service_role) which bypasses RLS,
-- so this doesn't break public lead creation from tenant pages.
DROP POLICY IF EXISTS lead_insert ON leads;
CREATE POLICY lead_insert ON leads FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
);

-- 3. Fix lead_tags INSERT — verify the lead belongs to user's org
DROP POLICY IF EXISTS lead_tag_insert ON lead_tags;
CREATE POLICY lead_tag_insert ON lead_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = lead_tags.lead_id
    AND leads.organization_id = get_user_org_id()
  )
);

-- 4. Fix conversations INSERT — require org_id matches user's org
-- Note: Chat widget creates conversations via adminClient which bypasses RLS.
DROP POLICY IF EXISTS conv_insert ON conversations;
CREATE POLICY conv_insert ON conversations FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
);

-- 5. Fix messages INSERT — verify the conversation belongs to user's org
-- Note: Chat widget inserts messages via adminClient which bypasses RLS.
DROP POLICY IF EXISTS msg_insert ON messages;
CREATE POLICY msg_insert ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.organization_id = get_user_org_id()
  )
);

-- 6. Fix audit_logs INSERT — scope to user's org
DROP POLICY IF EXISTS audit_insert ON audit_logs;
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
);
