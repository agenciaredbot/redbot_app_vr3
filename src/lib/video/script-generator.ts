/**
 * Property Script Generator
 *
 * Generates marketing video scripts in Spanish from property data.
 * Template-based for MVP — no AI calls needed.
 */

import type { Property } from "@/lib/supabase/types";

// ── Property type labels (Spanish) ──
const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  office: "Oficina",
  commercial: "Local Comercial",
  lot: "Lote",
  warehouse: "Bodega",
  farm: "Finca",
  studio: "Estudio",
  penthouse: "Penthouse",
  duplex: "Dúplex",
  townhouse: "Casa Adosada",
  building: "Edificio",
};

const BUSINESS_TYPES: Record<string, string> = {
  sale: "en Venta",
  rent: "en Arriendo",
  sale_rent: "en Venta y Arriendo",
};

/**
 * Extract text from i18n JSON field (title/description).
 * Supports both string and { es: string } formats.
 */
function extractText(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null) {
    const obj = field as Record<string, unknown>;
    return (obj.es || obj.en || Object.values(obj)[0] || "") as string;
  }
  return "";
}

/**
 * Format price in Colombian style.
 */
function formatPrice(price: number | null, currency: string | null): string {
  if (!price) return "";
  const curr = currency || "COP";
  if (curr === "COP") {
    return `$${price.toLocaleString("es-CO")} COP`;
  }
  return `$${price.toLocaleString("en-US")} USD`;
}

/**
 * Generate a marketing video script from property data.
 * Returns a ready-to-use script in Spanish.
 */
export function generatePropertyScript(property: Property): string {
  const title = extractText(property.title);
  const propertyType =
    PROPERTY_TYPES[property.property_type || ""] || property.property_type || "Propiedad";
  const businessType =
    BUSINESS_TYPES[property.business_type || ""] || "";

  // Location
  const locationParts = [
    property.locality || property.zone,
    property.city,
  ].filter(Boolean);
  const location = locationParts.join(", ");

  // Specs
  const specs: string[] = [];
  if (property.bedrooms) specs.push(`${property.bedrooms} habitaciones`);
  if (property.bathrooms) specs.push(`${property.bathrooms} baños`);
  if (property.built_area_m2) specs.push(`${property.built_area_m2} metros cuadrados`);
  if (property.parking_spots) specs.push(`${property.parking_spots} parqueaderos`);

  // Price
  const price =
    property.sale_price || property.rent_price;
  const priceFormatted = formatPrice(price, property.currency);

  // Features (first 4)
  const features = (property.features || []).slice(0, 4);

  // Build script
  const lines: string[] = [];

  // Opening hook
  if (title) {
    lines.push(title);
  } else {
    lines.push(
      `${propertyType} ${businessType}${location ? ` en ${location}` : ""}`
    );
  }

  // Specs line
  if (specs.length > 0) {
    lines.push(specs.join(", ") + ".");
  }

  // Price
  if (priceFormatted) {
    lines.push(`Precio: ${priceFormatted}.`);
  }

  // Features
  if (features.length > 0) {
    lines.push(features.join(", ") + ".");
  }

  // Description snippet
  const description = extractText(property.description);
  if (description) {
    // Take first 150 chars of description
    const snippet =
      description.length > 150
        ? description.slice(0, 147) + "..."
        : description;
    lines.push(snippet);
  }

  // CTA
  lines.push("Contáctanos hoy para agendar tu visita.");

  return lines.join("\n\n");
}
