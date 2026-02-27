/**
 * Portal Syndication — Core types & portal registry
 *
 * Proppit (by Lifull Connect) is the primary integration.
 * One XML feed publishes to: Properati, Trovit, Mitula,
 * Nestoria, Nuroa, PuntoPropiedad, iCasas.
 */

// ──────────────────────────────────────────────
//  Portal identity
// ──────────────────────────────────────────────

export type PortalSlug = "proppit";

export type PortalType = "xml_feed";

export type SyncStatus = "pending" | "syncing" | "success" | "error";

export type ListingStatus = "pending" | "published" | "error" | "removed";

// ──────────────────────────────────────────────
//  Portal definitions
// ──────────────────────────────────────────────

export interface PortalDefinition {
  slug: PortalSlug;
  name: string;
  type: PortalType;
  description: string;
  website: string;
  /** Portals included in this integration */
  includedPortals: string[];
}

/** Single source of truth for all supported portals */
export const PORTAL_REGISTRY: Record<PortalSlug, PortalDefinition> = {
  proppit: {
    slug: "proppit",
    name: "Proppit",
    type: "xml_feed",
    description:
      "Publica automáticamente en los principales portales inmobiliarios de Colombia y Latinoamérica.",
    website: "https://proppit.com",
    includedPortals: [
      "Properati",
      "Trovit",
      "Mitula",
      "Nestoria",
      "Nuroa",
      "PuntoPropiedad",
      "iCasas",
    ],
  },
};

export const PORTAL_SLUGS = Object.keys(PORTAL_REGISTRY) as PortalSlug[];

// ──────────────────────────────────────────────
//  DB row types (matching migration)
// ──────────────────────────────────────────────

export interface PortalConnection {
  id: string;
  organization_id: string;
  portal_slug: PortalSlug;
  is_active: boolean;
  credentials: Record<string, string>;
  last_sync_at: string | null;
  last_sync_status: SyncStatus;
  last_sync_error: string | null;
  properties_synced: number;
  created_at: string;
  updated_at: string;
}

export interface PortalListing {
  id: string;
  property_id: string;
  portal_connection_id: string;
  external_id: string | null;
  status: ListingStatus;
  last_error: string | null;
  published_at: string | null;
  updated_at: string;
}

// ──────────────────────────────────────────────
//  Property data for feeds
// ──────────────────────────────────────────────

/** Normalized property data passed to feed generators */
export interface PortalPropertyData {
  id: string;
  title: string;
  description: string;
  property_type: string;
  business_type: string;
  price: number;
  currency: string;
  city: string;
  neighborhood?: string;
  address?: string;
  area_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spots?: number;
  stratum?: number;
  year_built?: number;
  images: { url: string; position: number }[];
  url: string; // public URL on tenant portal
}
