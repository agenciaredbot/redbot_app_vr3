-- ============================================================
-- REDBOT.APP — WhatsApp Channels (Evolution API Integration)
-- Each org can connect one WhatsApp instance (MVP)
-- ============================================================

-- ============================================================
-- WHATSAPP INSTANCES
-- Tracks Evolution API instance per organization
-- ============================================================
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Evolution API identifiers
  instance_name TEXT NOT NULL UNIQUE,    -- e.g. "redbot-proper-home"
  instance_token TEXT,                    -- per-instance token from Evolution

  -- Connection state
  connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'failed')),
  connected_phone TEXT,                  -- e.g. "+573001234567"
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,

  -- Admin controls
  is_active BOOLEAN NOT NULL DEFAULT TRUE,   -- admin can disable without disconnecting
  auto_reply BOOLEAN NOT NULL DEFAULT TRUE,  -- AI auto-responds to messages

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One instance per org in MVP
  CONSTRAINT whatsapp_instances_org_unique UNIQUE (organization_id)
);

-- Indexes
CREATE INDEX idx_whatsapp_inst_org ON whatsapp_instances(organization_id);
CREATE INDEX idx_whatsapp_inst_name ON whatsapp_instances(instance_name);
CREATE INDEX idx_whatsapp_inst_status ON whatsapp_instances(connection_status)
  WHERE connection_status = 'connected';

-- ============================================================
-- ALTER CONVERSATIONS — Add WhatsApp channel support
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS whatsapp_jid TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'web'
    CHECK (channel IN ('web', 'whatsapp'));

-- Index for finding WhatsApp conversations by JID
CREATE INDEX IF NOT EXISTS idx_conv_whatsapp_jid
  ON conversations(organization_id, whatsapp_jid)
  WHERE whatsapp_jid IS NOT NULL;

-- Index for filtering by channel
CREATE INDEX IF NOT EXISTS idx_conv_channel
  ON conversations(channel);

-- ============================================================
-- RLS POLICIES — whatsapp_instances
-- ============================================================
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- org_admin and super_admin can read their org's instance
CREATE POLICY whatsapp_instances_select ON whatsapp_instances
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

-- org_admin and super_admin can insert/update their org's instance
CREATE POLICY whatsapp_instances_insert ON whatsapp_instances
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY whatsapp_instances_update ON whatsapp_instances
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY whatsapp_instances_delete ON whatsapp_instances
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

-- ============================================================
-- Updated_at trigger for whatsapp_instances
-- ============================================================
CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_instances_updated_at();
