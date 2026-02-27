-- ============================================================
-- Migration 00015: Opportunities — Cross-tenant property sharing network
-- ============================================================
-- Allows organizations to search, request, and share properties
-- between each other. Includes commission tracking, trusted
-- partner networks, and reverse requests (property wanted ads).
-- ============================================================

-- ============================================================
-- 1. shared_properties — Core: property sharing between orgs
-- ============================================================
CREATE TABLE shared_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_org_id UUID NOT NULL REFERENCES organizations(id),
  requester_org_id UUID NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'revoked', 'expired')),

  -- Commission
  commission_percent DECIMAL(5,2),
  commission_notes TEXT,

  -- Metadata
  request_message TEXT,
  response_message TEXT,
  requested_by UUID REFERENCES user_profiles(id),
  responded_by UUID REFERENCES user_profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(property_id, requester_org_id)
);

CREATE INDEX idx_shared_prop_owner ON shared_properties(owner_org_id, status);
CREATE INDEX idx_shared_prop_requester ON shared_properties(requester_org_id, status);
CREATE INDEX idx_shared_prop_property ON shared_properties(property_id);

-- ============================================================
-- 2. trusted_partners — Pre-approved partner relationships
-- ============================================================
CREATE TABLE trusted_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auto_approve BOOLEAN DEFAULT FALSE,
  default_commission DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, partner_org_id)
);

CREATE INDEX idx_trusted_org ON trusted_partners(org_id);
CREATE INDEX idx_trusted_partner ON trusted_partners(partner_org_id);

-- ============================================================
-- 3. opportunity_requests — Reverse requests ("I'm looking for X")
-- ============================================================
CREATE TABLE opportunity_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),

  -- Search criteria
  title TEXT NOT NULL,
  property_type TEXT,
  business_type TEXT,
  city TEXT,
  zone TEXT,
  min_price BIGINT,
  max_price BIGINT,
  min_bedrooms INTEGER,
  min_bathrooms INTEGER,
  min_area_m2 DECIMAL(10,2),
  additional_notes TEXT,

  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Track last match run to avoid duplicate notifications
  last_matched_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opp_req_status ON opportunity_requests(status, city, property_type);
CREATE INDEX idx_opp_req_org ON opportunity_requests(organization_id);

-- ============================================================
-- 4. RLS Policies
-- ============================================================

ALTER TABLE shared_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_requests ENABLE ROW LEVEL SECURITY;

-- shared_properties: both orgs can view
CREATE POLICY "Org members can view their shared properties"
  ON shared_properties FOR SELECT USING (
    owner_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    OR requester_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- shared_properties: requester org can insert
CREATE POLICY "Org members can request shared properties"
  ON shared_properties FOR INSERT WITH CHECK (
    requester_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- shared_properties: owner org can update (approve/reject)
CREATE POLICY "Owner org can respond to share requests"
  ON shared_properties FOR UPDATE USING (
    owner_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- trusted_partners: own org only
CREATE POLICY "Org members can view their trusted partners"
  ON trusted_partners FOR SELECT USING (
    org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    OR partner_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org admins can manage trusted partners"
  ON trusted_partners FOR ALL USING (
    org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- opportunity_requests: active ones visible to all authenticated, own org can manage
CREATE POLICY "Anyone can view active opportunity requests"
  ON opportunity_requests FOR SELECT USING (
    status = 'active'
    OR organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org members can manage their opportunity requests"
  ON opportunity_requests FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org members can update their opportunity requests"
  ON opportunity_requests FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org members can delete their opportunity requests"
  ON opportunity_requests FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 5. Triggers: updated_at
-- ============================================================

CREATE TRIGGER set_updated_at_shared_properties
  BEFORE UPDATE ON shared_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_opportunity_requests
  BEFORE UPDATE ON opportunity_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. Extend notification types
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead', 'lead_stage_change', 'new_message',
    'property_inquiry', 'system', 'subscription',
    'opportunity_request', 'opportunity_approved', 'opportunity_rejected',
    'reverse_request_match'
  ));
