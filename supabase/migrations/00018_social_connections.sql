-- ============================================================
-- Social Connections & Posts
-- Stores Late API keys per organization + tracks Instagram posts
-- ============================================================

-- Tabla: social_connections
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'late',
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_accounts JSONB DEFAULT '[]'::jsonb,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, platform)
);

-- Tabla: social_posts
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  platform_post_id TEXT,
  platform_post_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  caption TEXT,
  images_used TEXT[] DEFAULT '{}',
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_social_connections_org ON social_connections(organization_id);
CREATE INDEX idx_social_posts_property ON social_posts(property_id);
CREATE INDEX idx_social_posts_org ON social_posts(organization_id);

-- RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: social_connections
CREATE POLICY "social_connections_select_own_org"
  ON social_connections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "social_connections_insert_admin"
  ON social_connections FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY "social_connections_update_admin"
  ON social_connections FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY "social_connections_delete_admin"
  ON social_connections FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'org_admin')
    )
  );

-- RLS Policies: social_posts
CREATE POLICY "social_posts_select_own_org"
  ON social_posts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "social_posts_insert_admin"
  ON social_posts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'org_admin')
    )
  );

-- Updated_at trigger for social_connections
CREATE TRIGGER set_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
