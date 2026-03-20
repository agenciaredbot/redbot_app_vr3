-- ============================================================
-- Video Projects (Revid AI integration)
-- Stores metadata for property marketing videos.
-- No video binary stored — hosted on Revid CDN.
-- ============================================================

CREATE TABLE video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Revid project tracking
  revid_project_id TEXT,
  revid_status TEXT NOT NULL DEFAULT 'pending',  -- pending | rendering | completed | failed
  revid_video_url TEXT,
  revid_thumbnail_url TEXT,

  -- Configuration used for this render
  workflow TEXT NOT NULL DEFAULT 'script-to-video',
  script TEXT NOT NULL,
  images_used TEXT[] DEFAULT '{}',
  voice_id TEXT,
  music_track TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '9 / 16',

  -- Metadata
  credits_used INTEGER,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_video_projects_property ON video_projects(property_id);
CREATE INDEX idx_video_projects_org ON video_projects(organization_id);
CREATE INDEX idx_video_projects_revid_pid ON video_projects(revid_project_id);
CREATE INDEX idx_video_projects_status ON video_projects(revid_status);

-- RLS
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_projects_select_own_org"
  ON video_projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "video_projects_insert_admin"
  ON video_projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE POLICY "video_projects_update_admin"
  ON video_projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'org_admin')
    )
  );

-- Trigger: updated_at (reuse existing function if available)
-- Note: video_projects doesn't have updated_at column — status changes tracked via revid_status + completed_at
