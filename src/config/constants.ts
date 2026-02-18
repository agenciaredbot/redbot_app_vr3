import type {
  PropertyType,
  BusinessType,
  PipelineStage,
  Availability,
} from "@/lib/supabase/types";

export const APP_NAME = "Redbot";
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
export const DEFAULT_LOCALE = "es";

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "casa_campestre", label: "Casa campestre" },
  { value: "apartaestudio", label: "Apartaestudio" },
  { value: "duplex", label: "Dúplex" },
  { value: "penthouse", label: "Penthouse" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
  { value: "lote", label: "Lote" },
  { value: "finca", label: "Finca" },
  { value: "bodega", label: "Bodega" },
  { value: "consultorio", label: "Consultorio" },
];

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "venta", label: "Venta" },
  { value: "arriendo", label: "Arriendo" },
  { value: "venta_arriendo", label: "Venta y Arriendo" },
];

export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: "nuevo", label: "Nuevo", color: "#3B82F6" },
  { value: "contactado", label: "Contactado", color: "#06B6D4" },
  { value: "calificado", label: "Calificado", color: "#8B5CF6" },
  { value: "visita_tour", label: "Visita/Tour", color: "#F59E0B" },
  { value: "oferta", label: "Oferta", color: "#F97316" },
  { value: "bajo_contrato", label: "Bajo contrato", color: "#10B981" },
  { value: "cerrado", label: "Cerrado", color: "#16A34A" },
  { value: "perdido", label: "Perdido", color: "#6B7280" },
];

export const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "vendido", label: "Vendido" },
  { value: "arrendado", label: "Arrendado" },
  { value: "reservado", label: "Reservado" },
];

export const PROPERTY_STATUS_OPTIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
  { value: "en_construccion", label: "En construcción" },
  { value: "remodelado", label: "Remodelado" },
];

export const CURRENCY_OPTIONS = [
  { value: "COP", label: "COP (Peso colombiano)", symbol: "$" },
  { value: "USD", label: "USD (Dólar)", symbol: "US$" },
];

export const STRATUM_OPTIONS = [1, 2, 3, 4, 5, 6];

export const TIMELINE_OPTIONS: { value: string; label: string }[] = [
  { value: "inmediato", label: "Inmediato" },
  { value: "1-3 meses", label: "1-3 meses" },
  { value: "3-6 meses", label: "3-6 meses" },
  { value: "6+ meses", label: "6+ meses" },
  { value: "indefinido", label: "Indefinido" },
];

export const LEAD_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "chat_ai", label: "Chat AI" },
  { value: "referido", label: "Referido" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "portal", label: "Portal inmobiliario" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "evento", label: "Evento" },
];

export const TAG_CATEGORY_LABELS: Record<string, string> = {
  tipo: "Tipo de cliente",
  fuente: "Fuente",
  temperatura: "Temperatura",
  razon_salida: "Razón de salida",
  propiedad: "Tipo de propiedad",
  financiero: "Estado financiero",
  reactivacion: "Reactivación",
  custom: "Personalizados",
};

export const COLOMBIAN_CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
  "Santa Marta",
  "Villavicencio",
  "Armenia",
  "Ibagué",
  "Cúcuta",
  "Neiva",
  "Pasto",
  "Montería",
  "Tunja",
  "Popayán",
];
