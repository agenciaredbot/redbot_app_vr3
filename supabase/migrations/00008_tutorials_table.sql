-- Tutorials table — global, managed by super_admin
-- Two categories: 'general' (all tenants) and 'premium' (power/omni tenants only)

CREATE TABLE IF NOT EXISTS tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'premium')),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common query: published tutorials sorted
CREATE INDEX IF NOT EXISTS idx_tutorials_published ON tutorials(is_published, category, sort_order);

-- RLS
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read published tutorials
CREATE POLICY tutorials_select ON tutorials FOR SELECT USING (
  is_published = TRUE OR get_user_role() = 'super_admin'
);

-- Only super_admin can insert/update/delete
CREATE POLICY tutorials_insert ON tutorials FOR INSERT WITH CHECK (
  get_user_role() = 'super_admin'
);

CREATE POLICY tutorials_update ON tutorials FOR UPDATE USING (
  get_user_role() = 'super_admin'
);

CREATE POLICY tutorials_delete ON tutorials FOR DELETE USING (
  get_user_role() = 'super_admin'
);

-- Seed initial tutorial placeholders
INSERT INTO tutorials (title, description, category, sort_order, is_published) VALUES
  ('Primeros pasos con Redbot', 'Aprende a configurar tu cuenta y navegar el panel de administración.', 'general', 1, FALSE),
  ('Cómo crear un usuario', 'Invita y gestiona los miembros de tu equipo inmobiliario.', 'general', 2, FALSE),
  ('Cómo crear una propiedad', 'Publica propiedades con fotos, precios y características detalladas.', 'general', 3, FALSE),
  ('Cómo cargar propiedades masivamente', 'Importa tu base de datos de propiedades de forma rápida y sencilla.', 'general', 4, FALSE),
  ('Configuración de marca e identidad visual', 'Personaliza colores, logo y apariencia de tu chatbot.', 'general', 5, FALSE),
  ('Cómo funciona el agente de IA', 'Entiende cómo el chatbot responde preguntas y captura leads.', 'general', 6, FALSE),
  ('Gestión de leads y conversaciones', 'Revisa y administra los leads generados por el agente.', 'general', 7, FALSE),
  ('Configuración del equipo de trabajo', 'Asigna roles y permisos a tu equipo.', 'general', 8, FALSE),
  ('Estrategias avanzadas de captación', 'Técnicas premium para maximizar la generación de leads.', 'premium', 1, FALSE),
  ('Analítica avanzada de conversaciones', 'Métricas profundas para entender el rendimiento de tu agente.', 'premium', 2, FALSE),
  ('Personalización avanzada del agente', 'Ajusta la personalidad y respuestas del chatbot a nivel experto.', 'premium', 3, FALSE),
  ('Integraciones y automatizaciones', 'Conecta Redbot con tus herramientas de CRM y marketing.', 'premium', 4, FALSE);
