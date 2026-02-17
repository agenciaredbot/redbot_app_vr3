-- ============================================================
-- Add extra lead qualification fields
-- ============================================================

ALTER TABLE leads
  ADD COLUMN budget BIGINT,
  ADD COLUMN property_summary TEXT,
  ADD COLUMN preferred_zones TEXT,
  ADD COLUMN timeline TEXT;

COMMENT ON COLUMN leads.budget IS 'Presupuesto aproximado del lead en COP';
COMMENT ON COLUMN leads.property_summary IS 'Resumen de lo que busca el lead (tipo, tamaño, características)';
COMMENT ON COLUMN leads.preferred_zones IS 'Zonas o barrios de preferencia';
COMMENT ON COLUMN leads.timeline IS 'Urgencia: inmediato, 1-3 meses, 3-6 meses, 6+ meses, indefinido';
