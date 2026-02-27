import type { Database } from "./database.types";

// Convenience types for table rows
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"];
export type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"];

export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
export type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];

export type LeadTag = Database["public"]["Tables"]["lead_tags"]["Row"];

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

// ── Opportunities (cross-tenant property sharing) ──

export type SharedPropertyStatus = "pending" | "approved" | "rejected" | "revoked" | "expired";
export type OpportunityRequestStatus = "active" | "fulfilled" | "expired" | "cancelled";

export interface SharedProperty {
  id: string;
  property_id: string;
  owner_org_id: string;
  requester_org_id: string;
  status: SharedPropertyStatus;
  commission_percent: number | null;
  commission_notes: string | null;
  request_message: string | null;
  response_message: string | null;
  requested_by: string | null;
  responded_by: string | null;
  requested_at: string;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharedPropertyWithDetails extends SharedProperty {
  property?: Property;
  owner_org?: { name: string; slug: string };
  requester_org?: { name: string; slug: string };
}

export interface TrustedPartner {
  id: string;
  org_id: string;
  partner_org_id: string;
  auto_approve: boolean;
  default_commission: number | null;
  created_at: string;
  partner_org?: { name: string; slug: string };
}

export interface OpportunityRequest {
  id: string;
  organization_id: string;
  created_by: string | null;
  title: string;
  property_type: string | null;
  business_type: string | null;
  city: string | null;
  zone: string | null;
  min_price: number | null;
  max_price: number | null;
  min_bedrooms: number | null;
  min_bathrooms: number | null;
  min_area_m2: number | null;
  additional_notes: string | null;
  status: OpportunityRequestStatus;
  expires_at: string | null;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: { name: string; slug: string };
}

// Helper types
export type UserRole = "super_admin" | "org_admin" | "org_agent";

export type PipelineStage =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "visita_tour"
  | "oferta"
  | "bajo_contrato"
  | "cerrado"
  | "perdido";

export type PropertyType =
  | "apartamento"
  | "casa"
  | "casa_campestre"
  | "apartaestudio"
  | "duplex"
  | "penthouse"
  | "local"
  | "oficina"
  | "lote"
  | "finca"
  | "bodega"
  | "consultorio";

export type BusinessType = "venta" | "arriendo" | "venta_arriendo";

export type Availability = "disponible" | "vendido" | "arrendado" | "reservado";

export type PlanTier = "basic" | "power" | "omni";

export type I18nText = {
  es: string;
  en?: string;
};
