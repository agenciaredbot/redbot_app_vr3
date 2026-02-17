-- ============================================================
-- Tabla: invitations
-- Permite a org_admin invitar nuevos miembros al equipo via link.
-- ============================================================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'org_agent' CHECK (role IN ('org_admin', 'org_agent')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_invitation_token ON invitations(token);
CREATE INDEX idx_invitation_org ON invitations(organization_id);

-- RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY inv_select ON invitations FOR SELECT USING (
  organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
);

CREATE POLICY inv_insert ON invitations FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
);

CREATE POLICY inv_update ON invitations FOR UPDATE USING (
  organization_id = get_user_org_id()
);
