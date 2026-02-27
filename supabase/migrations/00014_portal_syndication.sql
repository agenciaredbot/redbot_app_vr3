-- ============================================================
-- REDBOT.APP — Portal Syndication
-- Publish properties to external real estate portals
-- via Proppit (Properati, Trovit, Mitula, Nestoria, +3)
-- ============================================================

-- ============================================================
-- PORTAL CONNECTIONS
-- One record per org per portal — stores credentials & sync state
-- ============================================================
CREATE TABLE portal_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Portal identity
  portal_slug TEXT NOT NULL,            -- 'proppit' (futuro: otros portales)

  -- State
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  credentials JSONB DEFAULT '{}',       -- {api_key, feed_url, etc.} varies per portal

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'pending'
    CHECK (last_sync_status IN ('pending', 'syncing', 'success', 'error')),
  last_sync_error TEXT,
  properties_synced INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One connection per portal per org
  CONSTRAINT portal_connections_org_portal_unique UNIQUE (organization_id, portal_slug)
);

-- Indexes
CREATE INDEX idx_portal_conn_org ON portal_connections(organization_id);
CREATE INDEX idx_portal_conn_active ON portal_connections(organization_id)
  WHERE is_active = TRUE;

-- ============================================================
-- PORTAL LISTINGS
-- Tracks the status of each property on each portal
-- ============================================================
CREATE TABLE portal_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  portal_connection_id UUID NOT NULL REFERENCES portal_connections(id) ON DELETE CASCADE,

  -- Portal-assigned ID (para futuras integraciones REST API)
  external_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'error', 'removed')),
  last_error TEXT,
  published_at TIMESTAMPTZ,

  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One listing per property per portal connection
  CONSTRAINT portal_listings_property_connection_unique UNIQUE (property_id, portal_connection_id)
);

-- Indexes
CREATE INDEX idx_portal_list_property ON portal_listings(property_id);
CREATE INDEX idx_portal_list_connection ON portal_listings(portal_connection_id);
CREATE INDEX idx_portal_list_pending ON portal_listings(portal_connection_id)
  WHERE status = 'pending';

-- ============================================================
-- RLS POLICIES — portal_connections
-- ============================================================
ALTER TABLE portal_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_connections_select ON portal_connections
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY portal_connections_insert ON portal_connections
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY portal_connections_update ON portal_connections
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY portal_connections_delete ON portal_connections
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

-- ============================================================
-- RLS POLICIES — portal_listings
-- ============================================================
ALTER TABLE portal_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_listings_select ON portal_listings
  FOR SELECT
  USING (
    portal_connection_id IN (
      SELECT pc.id FROM portal_connections pc
      JOIN user_profiles up ON up.organization_id = pc.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY portal_listings_insert ON portal_listings
  FOR INSERT
  WITH CHECK (
    portal_connection_id IN (
      SELECT pc.id FROM portal_connections pc
      JOIN user_profiles up ON up.organization_id = pc.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY portal_listings_update ON portal_listings
  FOR UPDATE
  USING (
    portal_connection_id IN (
      SELECT pc.id FROM portal_connections pc
      JOIN user_profiles up ON up.organization_id = pc.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY portal_listings_delete ON portal_listings
  FOR DELETE
  USING (
    portal_connection_id IN (
      SELECT pc.id FROM portal_connections pc
      JOIN user_profiles up ON up.organization_id = pc.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('super_admin', 'org_admin')
    )
  );

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_portal_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portal_connections_updated_at
  BEFORE UPDATE ON portal_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_connections_updated_at();

CREATE OR REPLACE FUNCTION update_portal_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portal_listings_updated_at
  BEFORE UPDATE ON portal_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_listings_updated_at();
