/**
 * XML Feed Adapter — Generates Proppit-compatible XML from properties
 *
 * Proppit (Lifull Connect) accepts Trovit XML format, which is the
 * de-facto standard for Latin American real estate aggregators.
 *
 * One feed publishes to: Properati, Trovit, Mitula, Nestoria,
 * Nuroa, PuntoPropiedad, iCasas.
 *
 * Reference: https://info.proppit.com/en/support/how-to-prepare-an-xml-file-for-proppit
 */

import type { PortalPropertyData } from "../types";

const PROPERTY_TYPE_MAP: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  casa_campestre: "Casa Campestre",
  apartaestudio: "Apartaestudio",
  duplex: "Dúplex",
  penthouse: "Penthouse",
  local: "Local Comercial",
  oficina: "Oficina",
  lote: "Lote",
  finca: "Finca",
  bodega: "Bodega",
  consultorio: "Consultorio",
};

const BUSINESS_TYPE_MAP: Record<string, string> = {
  venta: "For Sale",
  arriendo: "For Rent",
  venta_arriendo: "For Sale",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Generate a single <ad> element for the Proppit XML feed.
 */
function propertyToAdXml(property: PortalPropertyData, updatedAt: string): string {
  const lines: string[] = [];
  lines.push("  <ad>");
  lines.push(`    <id>${escapeXml(property.id)}</id>`);
  lines.push(`    <title><![CDATA[${property.title}]]></title>`);
  lines.push(`    <type>${escapeXml(PROPERTY_TYPE_MAP[property.property_type] || property.property_type)}</type>`);
  lines.push(`    <url><![CDATA[${property.url}]]></url>`);

  // Price
  lines.push(`    <price>${property.price}</price>`);
  lines.push(`    <currency>${escapeXml(property.currency)}</currency>`);

  // Location
  lines.push(`    <city><![CDATA[${property.city}]]></city>`);
  if (property.neighborhood) {
    lines.push(`    <region><![CDATA[${property.neighborhood}]]></region>`);
  }
  if (property.address) {
    lines.push(`    <address><![CDATA[${property.address}]]></address>`);
  }
  lines.push(`    <country>Colombia</country>`);

  // Specs
  if (property.bedrooms != null) {
    lines.push(`    <rooms>${property.bedrooms}</rooms>`);
  }
  if (property.bathrooms != null) {
    lines.push(`    <bathrooms>${property.bathrooms}</bathrooms>`);
  }
  if (property.area_m2 != null) {
    lines.push(`    <floor_area>${property.area_m2}</floor_area>`);
  }
  if (property.parking_spots != null) {
    lines.push(`    <parking>${property.parking_spots}</parking>`);
  }

  // Property type (Trovit format: For Sale / For Rent)
  lines.push(`    <property_type>${escapeXml(BUSINESS_TYPE_MAP[property.business_type] || "For Sale")}</property_type>`);

  // Images
  if (property.images.length > 0) {
    lines.push("    <pictures>");
    for (const img of property.images) {
      lines.push(`      <picture><picture_url><![CDATA[${img.url}]]></picture_url></picture>`);
    }
    lines.push("    </pictures>");
  }

  // Description
  if (property.description) {
    lines.push(`    <content><![CDATA[${property.description}]]></content>`);
  }

  // Date
  lines.push(`    <date>${formatDate(updatedAt)}</date>`);

  lines.push("  </ad>");
  return lines.join("\n");
}

/**
 * Generate a complete Proppit-compatible XML feed from an array of properties.
 * Uses Trovit XML format which Proppit (Lifull Connect) accepts.
 */
export function generateProppitXml(
  properties: (PortalPropertyData & { updated_at: string })[]
): string {
  const ads = properties.map((p) => propertyToAdXml(p, p.updated_at));

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<trovit>`,
    ...ads,
    `</trovit>`,
  ].join("\n");
}
