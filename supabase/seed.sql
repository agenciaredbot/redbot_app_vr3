-- Seed data for Redbot MVP Demo
-- Run after: npx supabase db reset (which applies migrations + seed)

-- ================================================
-- 1. Demo Organization
-- ================================================
INSERT INTO organizations (id, name, slug, city, country, phone, email, agent_name, agent_personality, agent_welcome_message, plan_tier, plan_status, max_properties, max_conversations_per_month, onboarding_completed)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Inmobiliaria Demo',
  'demo',
  'Bogotá',
  'Colombia',
  '+57 300 123 4567',
  'contacto@inmobiliariademo.com',
  'Ana',
  'Eres Ana, la asistente virtual de Inmobiliaria Demo. Hablas en español colombiano de manera cercana y profesional. Te encanta ayudar a las personas a encontrar su hogar ideal.',
  '{"es": "¡Hola! Soy Ana, tu asistente inmobiliaria virtual 🏠 ¿Estás buscando tu próximo hogar o inversión? Puedo ayudarte a encontrar la propiedad perfecta. ¿Qué tipo de propiedad te interesa?"}',
  'basic',
  'active',
  50,
  500,
  true
);

-- ================================================
-- 2. Demo Properties (15 Colombian properties)
-- ================================================

-- 1: Apartamento lujo Bogotá norte
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, currency, city, state_department, zone, address, built_area_m2, private_area_m2, bedrooms, bathrooms, parking_spots, stratum, year_built, features, is_published, is_featured)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Apartamento de lujo en Rosales"}', 'apartamento-lujo-rosales', '{"es":"Hermoso apartamento completamente remodelado en el exclusivo sector de Rosales. Acabados de primera, vista panorámica a los cerros orientales. Cocina abierta tipo americano con electrodomésticos importados. Zona social amplia ideal para entretenimiento."}', 'apartamento', 'venta', 850000000, 'COP', 'Bogotá', 'Cundinamarca', 'Rosales', 'Calle 72 #5-23', 120, 110, 3, 2, 2, 6, 2019, ARRAY['Gimnasio', 'Portería 24h', 'Zona BBQ', 'Vista panorámica', 'Cocina integral'], true, true);

-- 2: Casa Chía
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, currency, city, state_department, zone, built_area_m2, land_area_m2, bedrooms, bathrooms, parking_spots, stratum, year_built, features, is_published, is_featured)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Casa campestre en Chía con piscina"}', 'casa-campestre-chia', '{"es":"Espectacular casa campestre en condominio cerrado. Amplios jardines, piscina privada climatizada, zona de BBQ cubierta. 4 alcobas con baño privado, estudio, salón de juegos. Perfecta para familias que buscan tranquilidad cerca de Bogotá."}', 'casa_campestre', 'venta', 1200000000, 'COP', 'Chía', 'Cundinamarca', 'Condominio El Peñón', 350, 800, 4, 5, 3, 5, 2021, ARRAY['Piscina', 'Jardín', 'BBQ', 'Seguridad privada', 'Salón de juegos', 'Estudio'], true, true);

-- 3: Apto arriendo Chapinero
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, rent_price, admin_fee, currency, city, state_department, zone, built_area_m2, bedrooms, bathrooms, parking_spots, stratum, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Apartamento moderno en Chapinero Alto"}', 'apto-moderno-chapinero', '{"es":"Apartamento moderno y luminoso en Chapinero Alto. Perfecto para profesionales o parejas. Cerca a restaurantes, bares y transporte público. Edificio con zonas comunes completas."}', 'apartamento', 'arriendo', 3500000, 450000, 'COP', 'Bogotá', 'Cundinamarca', 'Chapinero Alto', 75, 2, 2, 1, 4, ARRAY['Gimnasio', 'Terraza comunal', 'Lavandería', 'Bicicletero'], true);

-- 4: Penthouse Poblado Medellín
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, currency, city, state_department, zone, built_area_m2, private_area_m2, bedrooms, bathrooms, parking_spots, stratum, year_built, features, is_published, is_featured)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Penthouse con terraza en El Poblado"}', 'penthouse-poblado-medellin', '{"es":"Espectacular penthouse duplex en el corazón de El Poblado. Terraza de 60m² con jacuzzi y vista 360° a la ciudad. Acabados de lujo, domótica, cocina tipo chef. Edificio boutique con solo 8 unidades."}', 'penthouse', 'venta', 2100000000, 'COP', 'Medellín', 'Antioquia', 'El Poblado', 280, 250, 3, 4, 3, 6, 2023, ARRAY['Jacuzzi', 'Terraza privada', 'Domótica', 'Vista 360°', 'Portería 24h'], true, true);

-- 5: Oficina Bogotá
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, rent_price, admin_fee, currency, city, state_department, zone, built_area_m2, bathrooms, parking_spots, stratum, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Oficina premium en Zona T"}', 'oficina-zona-t', '{"es":"Oficina comercial en ubicación prime de la Zona T. Piso alto con vista a la ciudad. Recepción, 4 oficinas privadas, sala de juntas, kitchenette. Edificio clase A con seguridad 24/7."}', 'oficina', 'arriendo', 8500000, 1200000, 'COP', 'Bogotá', 'Cundinamarca', 'Zona T', 150, 3, 2, 6, ARRAY['Recepción', 'Sala de juntas', 'Seguridad 24/7', 'Ascensor privado'], true);

-- 6: Apartaestudio
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, rent_price, admin_fee, currency, city, state_department, zone, built_area_m2, bedrooms, bathrooms, stratum, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Apartaestudio amoblado en Cedritos"}', 'apartaestudio-cedritos', '{"es":"Apartaestudio completamente amoblado y equipado. Ideal para estudiantes o profesionales. Zona tranquila con fácil acceso a transporte. Incluye servicios de internet y TV cable."}', 'apartaestudio', 'arriendo', 1800000, 250000, 'COP', 'Bogotá', 'Cundinamarca', 'Cedritos', 38, 1, 1, 4, ARRAY['Amoblado', 'Internet incluido', 'Lavandería comunal'], true);

-- 7: Casa Cali
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, currency, city, state_department, zone, built_area_m2, land_area_m2, bedrooms, bathrooms, parking_spots, stratum, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Casa moderna en Ciudad Jardín, Cali"}', 'casa-ciudad-jardin-cali', '{"es":"Hermosa casa moderna en el prestigioso barrio Ciudad Jardín. Diseño contemporáneo con espacios abiertos, iluminación natural excepcional. Piscina, jardín tropical y zona social cubierta."}', 'casa', 'venta', 980000000, 'COP', 'Cali', 'Valle del Cauca', 'Ciudad Jardín', 250, 400, 4, 3, 2, 5, ARRAY['Piscina', 'Jardín', 'Zona social', 'Seguridad'], true);

-- 8: Lote Cartagena
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, currency, city, state_department, zone, land_area_m2, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Lote frente al mar en Barú"}', 'lote-baru-cartagena', '{"es":"Exclusivo lote frente al mar en la zona más cotizada de Barú. Ideal para proyecto hotelero o residencia de lujo. Acceso directo a playa privada. Todos los servicios disponibles."}', 'lote', 'venta', 3500000000, 'COP', 'Cartagena', 'Bolívar', 'Barú', 2000, ARRAY['Frente al mar', 'Playa privada', 'Servicios disponibles'], true);

-- 9: Apartamento Barranquilla
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, rent_price, currency, city, state_department, zone, built_area_m2, bedrooms, bathrooms, parking_spots, stratum, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Apartamento con vista al río en Barranquilla"}', 'apto-rio-barranquilla', '{"es":"Moderno apartamento con espectacular vista al Río Magdalena. Amplio balcón, acabados de lujo, cocina integral. Conjunto cerrado con amenidades completas."}', 'apartamento', 'venta_arriendo', 420000000, 2800000, 'COP', 'Barranquilla', 'Atlántico', 'Alto Prado', 95, 3, 2, 1, 5, ARRAY['Vista al río', 'Balcón', 'Piscina', 'Gimnasio'], true);

-- 10: Finca cafetera
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, currency, city, state_department, zone, built_area_m2, land_area_m2, bedrooms, bathrooms, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Finca cafetera en el Eje Cafetero"}', 'finca-cafetera-eje', '{"es":"Hermosa finca cafetera productiva en el corazón del Eje Cafetero. Casa principal remodelada, 2 cabañas para huéspedes, 5 hectáreas de café variedad Castillo. Ideal como inversión agro-turística."}', 'finca', 'venta', 750000000, 'COP', 'Pereira', 'Risaralda', 'Vereda La Colina', 180, 50000, 5, 4, ARRAY['Cultivo de café', 'Cabañas', 'Río', 'Senderos', 'Vista panorámica'], true);

-- 11: Local comercial
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, rent_price, admin_fee, currency, city, state_department, zone, built_area_m2, bathrooms, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Local comercial en Centro Comercial Andino"}', 'local-cc-andino', '{"es":"Local comercial en excelente ubicación dentro del Centro Comercial Andino. Alto flujo peatonal, ideal para retail de moda, gastronomía o servicios. Entrega en obra gris."}', 'local', 'arriendo', 12000000, 2500000, 'COP', 'Bogotá', 'Cundinamarca', 'Zona Rosa', 85, 2, ARRAY['Centro comercial', 'Alto tráfico', 'Parqueadero visitantes'], true);

-- 12: Duplex Bogotá
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, currency, city, state_department, zone, built_area_m2, bedrooms, bathrooms, parking_spots, stratum, year_built, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Dúplex con terraza en Usaquén"}', 'duplex-usaquen', '{"es":"Amplio dúplex en el corazón de Usaquén. Primer nivel: zona social con cocina abierta y salida a jardín. Segundo nivel: 3 habitaciones con walking closet. Terraza BBQ privada con vista a los cerros."}', 'duplex', 'venta', 680000000, 'COP', 'Bogotá', 'Cundinamarca', 'Usaquén', 165, 3, 3, 2, 5, 2020, ARRAY['Terraza BBQ', 'Walking closet', 'Jardín privado', 'Portería 24h'], true);

-- 13: Bodega
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, rent_price, currency, city, state_department, zone, built_area_m2, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Bodega industrial en Fontibón"}', 'bodega-fontibon', '{"es":"Bodega industrial con excelente ubicación logística cerca al aeropuerto El Dorado. Altura de 8 metros, piso en concreto reforzado, muelles de carga. Ideal para operaciones de distribución y almacenamiento."}', 'bodega', 'arriendo', 15000000, 'COP', 'Bogotá', 'Cundinamarca', 'Fontibón', 500, ARRAY['Muelles de carga', 'Seguridad 24h', 'Acceso vehicular', 'Cerca aeropuerto'], true);

-- 14: Apto Santa Marta
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, sale_price, rent_price, currency, city, state_department, zone, built_area_m2, bedrooms, bathrooms, parking_spots, stratum, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Apartamento frente a la playa en El Rodadero"}', 'apto-rodadero-santa-marta', '{"es":"Apartamento con acceso directo a la playa en El Rodadero. Balcón con vista al mar, completamente amoblado. Ideal como inversión para renta vacacional o vivienda permanente."}', 'apartamento', 'venta_arriendo', 380000000, 3200000, 'COP', 'Santa Marta', 'Magdalena', 'El Rodadero', 80, 2, 2, 1, 4, ARRAY['Frente al mar', 'Balcón', 'Piscina', 'Amoblado', 'Seguridad'], true);

-- 15: Consultorio médico
INSERT INTO properties (organization_id, title, slug, description, property_type, business_type, rent_price, admin_fee, currency, city, state_department, zone, built_area_m2, bathrooms, features, is_published)
VALUES ('00000000-0000-0000-0000-000000000001', '{"es":"Consultorio médico equipado en Santa Bárbara"}', 'consultorio-santa-barbara', '{"es":"Consultorio médico completamente equipado en torre médica de Santa Bárbara. Sala de espera, 2 consultorios, baño privado. Torre con parqueadero para pacientes y buena conectividad."}', 'consultorio', 'arriendo', 4500000, 800000, 'COP', 'Bogotá', 'Cundinamarca', 'Santa Bárbara', 55, 2, ARRAY['Torre médica', 'Equipado', 'Parqueadero pacientes', 'Sala de espera'], true);

-- ================================================
-- 3. Demo Leads
-- ================================================
INSERT INTO leads (organization_id, full_name, email, phone, pipeline_stage, source, notes) VALUES
('00000000-0000-0000-0000-000000000001', 'Carlos Rodríguez', 'carlos.rodriguez@email.com', '+57 310 555 1234', 'nuevo', 'ai_chat', 'Busca apartamento de 3 habitaciones en Bogotá norte, presupuesto ~800M COP'),
('00000000-0000-0000-0000-000000000001', 'María González', 'maria.gonzalez@email.com', '+57 320 555 5678', 'contactado', 'ai_chat', 'Interesada en casa campestre en Chía, tiene pre-aprobación bancaria'),
('00000000-0000-0000-0000-000000000001', 'Andrés Martínez', 'andres.m@email.com', '+57 300 555 9012', 'calificado', 'ai_chat', 'Inversionista, busca propiedades para renta en Medellín y Cartagena'),
('00000000-0000-0000-0000-000000000001', 'Laura Sánchez', 'laura.s@email.com', NULL, 'visita_tour', 'ai_chat', 'Visitó el penthouse en El Poblado, muy interesada, agenda segunda visita'),
('00000000-0000-0000-0000-000000000001', 'Roberto López', NULL, '+57 315 555 3456', 'nuevo', 'ai_chat', 'Preguntó por arriendos en Chapinero, presupuesto 3-4M COP');
