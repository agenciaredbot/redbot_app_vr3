-- ============================================================
-- Migration: AI Usage Logs — Token tracking for cost comparison
-- ============================================================
-- Tracks every AI API call with token counts and estimated costs.
-- Used to compare costs between models/providers (Claude vs Gemini, etc.)

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Model & provider
  model TEXT NOT NULL,                    -- e.g. "anthropic/claude-sonnet-4.5", "google/gemini-2.0-flash"
  provider TEXT NOT NULL DEFAULT 'openrouter',  -- "openrouter", "anthropic", "google"

  -- Token counts
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Cost estimate
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0, -- 6 decimal precision for micro-costs

  -- Context
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'web',    -- "web", "whatsapp", "api"
  metadata JSONB DEFAULT '{}'             -- extra context: tools used, loop count, etc.
);

-- Indexes for common queries
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs (created_at DESC);
CREATE INDEX idx_ai_usage_logs_org_id ON ai_usage_logs (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_ai_usage_logs_model ON ai_usage_logs (model);

-- RLS: only super_admin can read usage logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read ai_usage_logs"
  ON ai_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Service role (adminClient) can insert — used by the tracker
CREATE POLICY "Service role can insert ai_usage_logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (true);
