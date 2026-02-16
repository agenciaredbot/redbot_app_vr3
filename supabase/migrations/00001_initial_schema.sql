-- ============================================================
-- REDBOT.APP — Initial Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- ORGANIZATIONS (Tenants)
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  logo_url TEXT,
  description JSONB, -- {"es": "...", "en": "..."}
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#8B5CF6',
  country TEXT DEFAULT 'Colombia',
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- AI Agent configuration
  agent_name TEXT DEFAULT 'Agente Redbot',
  agent_personality TEXT,
  agent_welcome_message JSONB DEFAULT '{"es": "¡Hola! Soy tu asistente inmobiliario. ¿En qué puedo ayudarte hoy?"}',
  agent_language TEXT DEFAULT 'es',

  -- Subscription
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'power', 'omni')),
  plan_status TEXT NOT NULL DEFAULT 'trialing' CHECK (plan_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 days'),

  -- Limits (denormalized from plan)
  max_properties INTEGER NOT NULL DEFAULT 50,
  max_agents INTEGER NOT NULL DEFAULT 2,
  max_conversations_per_month INTEGER NOT NULL DEFAULT 100,
  conversations_used_this_month INTEGER NOT NULL DEFAULT 0,
  conversations_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_slug ON organizations(slug);
CREATE INDEX idx_org_custom_domain ON organizations(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_org_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'org_agent' CHECK (role IN ('super_admin', 'org_admin', 'org_agent')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  language_preference TEXT DEFAULT 'es' CHECK (language_preference IN ('es', 'en')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_org ON user_profiles(organization_id);
CREATE INDEX idx_user_role ON user_profiles(role);

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Identification
  external_code TEXT,
  title JSONB NOT NULL, -- {"es": "...", "en": "..."}
  slug TEXT NOT NULL,

  -- Location
  country TEXT DEFAULT 'Colombia',
  state_department TEXT,
  city TEXT,
  locality TEXT,
  zone TEXT,
  address TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  map_display TEXT DEFAULT 'zone' CHECK (map_display IN ('exact', 'zone')),

  -- Classification
  property_type TEXT NOT NULL CHECK (property_type IN (
    'apartamento', 'casa', 'casa_campestre', 'apartaestudio',
    'duplex', 'penthouse', 'local', 'oficina', 'lote',
    'finca', 'bodega', 'consultorio'
  )),
  business_type TEXT NOT NULL CHECK (business_type IN ('venta', 'arriendo', 'venta_arriendo')),
  property_status TEXT DEFAULT 'usado' CHECK (property_status IN ('nuevo', 'usado', 'en_construccion', 'remodelado')),
  availability TEXT DEFAULT 'disponible' CHECK (availability IN ('disponible', 'vendido', 'arrendado', 'reservado')),

  -- Pricing
  sale_price BIGINT DEFAULT 0,
  rent_price BIGINT DEFAULT 0,
  rent_period TEXT DEFAULT 'monthly' CHECK (rent_period IN ('monthly', 'daily', 'yearly')),
  currency TEXT DEFAULT 'COP',
  admin_fee BIGINT DEFAULT 0,

  -- Specs
  built_area_m2 DECIMAL(10, 2),
  private_area_m2 DECIMAL(10, 2),
  land_area_m2 DECIMAL(10, 2),
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  parking_spots INTEGER DEFAULT 0,
  stratum INTEGER CHECK (stratum IS NULL OR stratum BETWEEN 1 AND 6),
  year_built INTEGER,

  -- Content
  description JSONB, -- {"es": "...", "en": "..."}
  features TEXT[] DEFAULT '{}',

  -- Media
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  virtual_tour_url TEXT,

  -- External
  external_url TEXT,
  portals TEXT[] DEFAULT '{}',

  -- Private fields
  private_notes TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  commission_value DECIMAL(5, 2),
  commission_type TEXT DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed')),

  -- Metadata
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  views_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prop_org ON properties(organization_id);
CREATE INDEX idx_prop_agent ON properties(assigned_agent_id);
CREATE INDEX idx_prop_type ON properties(property_type);
CREATE INDEX idx_prop_business ON properties(business_type);
CREATE INDEX idx_prop_city ON properties(city);
CREATE INDEX idx_prop_availability ON properties(availability);
CREATE INDEX idx_prop_published ON properties(is_published);
CREATE UNIQUE INDEX idx_prop_org_slug ON properties(organization_id, slug);

-- Full text search (trigger-based because to_tsvector is not immutable)
ALTER TABLE properties ADD COLUMN fts tsvector;
CREATE INDEX idx_prop_fts ON properties USING GIN(fts);

CREATE OR REPLACE FUNCTION properties_fts_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.fts := to_tsvector('spanish',
    COALESCE(NEW.title->>'es', '') || ' ' ||
    COALESCE(NEW.description->>'es', '') || ' ' ||
    COALESCE(NEW.city, '') || ' ' ||
    COALESCE(NEW.zone, '') || ' ' ||
    COALESCE(NEW.property_type, '') || ' ' ||
    COALESCE(array_to_string(NEW.features, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_fts
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION properties_fts_update();

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  full_name TEXT,
  email TEXT,
  phone TEXT,

  pipeline_stage TEXT NOT NULL DEFAULT 'nuevo' CHECK (pipeline_stage IN (
    'nuevo', 'contactado', 'calificado', 'visita_tour',
    'oferta', 'bajo_contrato', 'cerrado', 'perdido'
  )),

  source TEXT,
  source_detail TEXT,
  initial_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  lost_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_org ON leads(organization_id);
CREATE INDEX idx_lead_stage ON leads(pipeline_stage);
CREATE INDEX idx_lead_agent ON leads(assigned_agent_id);
CREATE INDEX idx_lead_email ON leads(organization_id, email);

-- ============================================================
-- TAGS SYSTEM
-- ============================================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'tipo', 'fuente', 'temperatura', 'razon_salida',
    'propiedad', 'financiero', 'reactivacion', 'custom'
  )),
  value TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tag_unique ON tags(COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID), category, value);

CREATE TABLE lead_tags (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lead_id, tag_id)
);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  initial_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'web_chat',
  language TEXT DEFAULT 'es',

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  message_count INTEGER DEFAULT 0,
  session_id TEXT,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_conv_org ON conversations(organization_id);
CREATE INDEX idx_conv_lead ON conversations(lead_id);
CREATE INDEX idx_conv_status ON conversations(status);
CREATE INDEX idx_conv_session ON conversations(session_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool_call', 'tool_result')),
  content TEXT NOT NULL,

  tool_name TEXT,
  tool_input JSONB,
  tool_result JSONB,

  tokens_used INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_msg_conv ON messages(conversation_id);
CREATE INDEX idx_msg_created ON messages(created_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN (
    'new_lead', 'lead_stage_change', 'new_message',
    'property_inquiry', 'system', 'subscription'
  )),
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB,

  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX idx_notif_org ON notifications(organization_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES user_profiles(id),
  organization_id UUID REFERENCES organizations(id),

  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  ip_address INET,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY org_select ON organizations FOR SELECT USING (
  id = get_user_org_id()
  OR get_user_role() = 'super_admin'
  OR TRUE -- public access for tenant lookup by slug
);
CREATE POLICY org_update ON organizations FOR UPDATE USING (
  id = get_user_org_id() AND get_user_role() IN ('org_admin', 'super_admin')
);

-- User Profiles
CREATE POLICY user_select ON user_profiles FOR SELECT USING (
  organization_id = get_user_org_id()
  OR get_user_role() = 'super_admin'
  OR id = auth.uid()
);
CREATE POLICY user_update ON user_profiles FOR UPDATE USING (
  id = auth.uid() OR (organization_id = get_user_org_id() AND get_user_role() = 'org_admin')
);

-- Properties
CREATE POLICY prop_select ON properties FOR SELECT USING (
  organization_id = get_user_org_id()
  OR get_user_role() = 'super_admin'
  OR is_published = TRUE -- public access for tenant pages
);
CREATE POLICY prop_insert ON properties FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
);
CREATE POLICY prop_update ON properties FOR UPDATE USING (
  organization_id = get_user_org_id()
  AND (
    get_user_role() = 'org_admin'
    OR (get_user_role() = 'org_agent' AND assigned_agent_id = auth.uid())
  )
);
CREATE POLICY prop_delete ON properties FOR DELETE USING (
  organization_id = get_user_org_id() AND get_user_role() = 'org_admin'
);

-- Leads
CREATE POLICY lead_select ON leads FOR SELECT USING (
  organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
);
CREATE POLICY lead_insert ON leads FOR INSERT WITH CHECK (TRUE);
CREATE POLICY lead_update ON leads FOR UPDATE USING (
  organization_id = get_user_org_id()
);
CREATE POLICY lead_delete ON leads FOR DELETE USING (
  organization_id = get_user_org_id() AND get_user_role() = 'org_admin'
);

-- Tags
CREATE POLICY tag_select ON tags FOR SELECT USING (
  organization_id IS NULL -- system tags
  OR organization_id = get_user_org_id()
  OR get_user_role() = 'super_admin'
);
CREATE POLICY tag_insert ON tags FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
);
CREATE POLICY tag_update ON tags FOR UPDATE USING (
  organization_id = get_user_org_id() AND is_system = FALSE
);
CREATE POLICY tag_delete ON tags FOR DELETE USING (
  organization_id = get_user_org_id() AND is_system = FALSE
);

-- Lead Tags
CREATE POLICY lead_tag_select ON lead_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_tags.lead_id AND leads.organization_id = get_user_org_id())
);
CREATE POLICY lead_tag_insert ON lead_tags FOR INSERT WITH CHECK (TRUE);
CREATE POLICY lead_tag_delete ON lead_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_tags.lead_id AND leads.organization_id = get_user_org_id())
);

-- Conversations
CREATE POLICY conv_select ON conversations FOR SELECT USING (
  organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
);
CREATE POLICY conv_insert ON conversations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY conv_update ON conversations FOR UPDATE USING (
  organization_id = get_user_org_id()
);

-- Messages
CREATE POLICY msg_select ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.organization_id = get_user_org_id() OR get_user_role() = 'super_admin'))
);
CREATE POLICY msg_insert ON messages FOR INSERT WITH CHECK (TRUE);

-- Notifications
CREATE POLICY notif_select ON notifications FOR SELECT USING (
  organization_id = get_user_org_id()
  AND (user_id IS NULL OR user_id = auth.uid())
);
CREATE POLICY notif_update ON notifications FOR UPDATE USING (
  organization_id = get_user_org_id() AND (user_id IS NULL OR user_id = auth.uid())
);

-- Audit Logs (read only for admins)
CREATE POLICY audit_select ON audit_logs FOR SELECT USING (
  organization_id = get_user_org_id() AND get_user_role() = 'org_admin'
  OR get_user_role() = 'super_admin'
);
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('properties', 'properties', TRUE, 5242880); -- 5MB limit

CREATE POLICY storage_select ON storage.objects FOR SELECT USING (bucket_id = 'properties');
CREATE POLICY storage_insert ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'properties' AND auth.role() = 'authenticated'
);
CREATE POLICY storage_update ON storage.objects FOR UPDATE USING (
  bucket_id = 'properties' AND auth.role() = 'authenticated'
);
CREATE POLICY storage_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'properties' AND auth.role() = 'authenticated'
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DEFAULT SYSTEM TAGS
-- ============================================================
INSERT INTO tags (organization_id, category, value, color, is_system) VALUES
  -- TIPO
  (NULL, 'tipo', 'comprador', '#3B82F6', TRUE),
  (NULL, 'tipo', 'vendedor', '#10B981', TRUE),
  (NULL, 'tipo', 'arrendatario', '#8B5CF6', TRUE),
  (NULL, 'tipo', 'inversionista', '#F59E0B', TRUE),
  -- FUENTE
  (NULL, 'fuente', 'facebook', '#1877F2', TRUE),
  (NULL, 'fuente', 'google', '#EA4335', TRUE),
  (NULL, 'fuente', 'portal', '#6366F1', TRUE),
  (NULL, 'fuente', 'referido', '#14B8A6', TRUE),
  (NULL, 'fuente', 'organico', '#64748B', TRUE),
  -- TEMPERATURA
  (NULL, 'temperatura', 'caliente', '#EF4444', TRUE),
  (NULL, 'temperatura', 'tibio', '#F97316', TRUE),
  (NULL, 'temperatura', 'frio', '#06B6D4', TRUE),
  -- RAZON DE SALIDA
  (NULL, 'razon_salida', 'sin-respuesta', '#9CA3AF', TRUE),
  (NULL, 'razon_salida', 'sin-presupuesto', '#9CA3AF', TRUE),
  (NULL, 'razon_salida', 'eligio-otro', '#9CA3AF', TRUE),
  (NULL, 'razon_salida', 'no-encontro-propiedad', '#9CA3AF', TRUE),
  (NULL, 'razon_salida', 'cambio-de-planes', '#9CA3AF', TRUE),
  (NULL, 'razon_salida', 'datos-invalidos', '#9CA3AF', TRUE),
  -- PROPIEDAD
  (NULL, 'propiedad', 'apartamento', '#7C3AED', TRUE),
  (NULL, 'propiedad', 'casa', '#2563EB', TRUE),
  (NULL, 'propiedad', 'local', '#059669', TRUE),
  (NULL, 'propiedad', 'lote', '#D97706', TRUE),
  (NULL, 'propiedad', 'finca', '#15803D', TRUE),
  -- FINANCIERO
  (NULL, 'financiero', 'contado', '#16A34A', TRUE),
  (NULL, 'financiero', 'credito-aprobado', '#2563EB', TRUE),
  (NULL, 'financiero', 'credito-en-proceso', '#CA8A04', TRUE),
  (NULL, 'financiero', 'sin-verificar', '#9CA3AF', TRUE),
  -- REACTIVACION
  (NULL, 'reactivacion', 'reactivar-1-mes', '#F59E0B', TRUE),
  (NULL, 'reactivacion', 'reactivar-3-meses', '#F97316', TRUE),
  (NULL, 'reactivacion', 'reactivar-6-meses', '#EF4444', TRUE);
