import * as XLSX from "xlsx";
import { generateUniqueSlug } from "@/lib/utils/slug";

// ─── Types ───────────────────────────────────────────────────────

export interface ImportRow {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: string[];
  property?: PropertyInsertData;
}

export interface PropertyInsertData {
  title: { es: string };
  description: { es: string } | null;
  slug: string;
  property_type: string;
  business_type: string;
  property_status: string;
  availability: string;
  sale_price: number;
  rent_price: number;
  currency: string;
  admin_fee: number;
  city: string | null;
  state_department: string | null;
  zone: string | null;
  address: string | null;
  locality: string | null;
  built_area_m2: number | null;
  private_area_m2: number | null;
  land_area_m2: number | null;
  bedrooms: number;
  bathrooms: number;
  parking_spots: number;
  stratum: number | null;
  year_built: number | null;
  features: string[];
  is_published: boolean;
  is_featured: boolean;
  external_code: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  commission_value: number | null;
  commission_type: string;
  private_notes: string | null;
  images: string[];
}

export interface ColumnMapping {
  rawHeader: string;
  mappedField: string;
  confidence: "exact" | "contains" | "fuzzy";
}

export interface ImportPreview {
  rows: ImportRow[];
  columnMappings: ColumnMapping[];
  unmappedHeaders: string[];
  sheetName: string;
  availableSheets: string[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  sampleData: Record<string, unknown>[];
}

// ─── Column Mapping Dictionary ───────────────────────────────────

const COLUMN_MAP: Record<string, string> = {
  // Title
  titulo: "title",
  "título": "title",
  nombre: "title",
  name: "title",
  title: "title",
  "nombre del inmueble": "title",
  "titulo del inmueble": "title",
  "titulo inmueble": "title",
  "nombre propiedad": "title",

  // Description
  descripcion: "description",
  "descripción": "description",
  description: "description",
  detalle: "description",
  detalles: "description",

  // Property type
  tipo: "property_type",
  "tipo de inmueble": "property_type",
  "tipo inmueble": "property_type",
  type: "property_type",
  "property type": "property_type",
  inmueble: "property_type",
  propiedad: "property_type",
  clase: "property_type",
  "clase de inmueble": "property_type",

  // Business type
  negocio: "business_type",
  "tipo de negocio": "business_type",
  "tipo negocio": "business_type",
  operacion: "business_type",
  "operación": "business_type",
  "tipo de operacion": "business_type",
  "tipo operacion": "business_type",

  // Pricing
  "precio venta": "sale_price",
  "precio de venta": "sale_price",
  venta: "sale_price",
  "sale price": "sale_price",
  price: "sale_price",
  precio: "sale_price",
  valor: "sale_price",
  "valor venta": "sale_price",
  "valor de venta": "sale_price",
  "precio arriendo": "rent_price",
  "precio de arriendo": "rent_price",
  "precio alquiler": "rent_price",
  arriendo: "rent_price",
  alquiler: "rent_price",
  "rent price": "rent_price",
  canon: "rent_price",
  "canon mensual": "rent_price",
  "canon de arriendo": "rent_price",
  "valor arriendo": "rent_price",
  "valor de arriendo": "rent_price",
  administracion: "admin_fee",
  "administración": "admin_fee",
  "admin fee": "admin_fee",
  "cuota administracion": "admin_fee",
  "cuota admin": "admin_fee",
  "valor administracion": "admin_fee",
  "valor valor administracion": "admin_fee",
  moneda: "currency",
  currency: "currency",

  // Location
  ciudad: "city",
  city: "city",
  municipio: "city",
  departamento: "state_department",
  "estado departamento": "state_department",
  "estado / departamento": "state_department",
  state: "state_department",
  depto: "state_department",
  zona: "zone",
  barrio: "zone",
  sector: "zone",
  zone: "zone",
  neighborhood: "zone",
  ubicacion: "zone",
  "ubicación": "zone",
  direccion: "address",
  "dirección": "address",
  address: "address",
  localidad: "locality",

  // Specs
  habitaciones: "bedrooms",
  alcobas: "bedrooms",
  bedrooms: "bedrooms",
  rooms: "bedrooms",
  "numero de habitaciones": "bedrooms",
  "numero habitaciones": "bedrooms",
  "baños": "bathrooms",
  banos: "bathrooms",
  bathrooms: "bathrooms",
  "numero de banos": "bathrooms",
  "numero banos": "bathrooms",
  parqueaderos: "parking_spots",
  parqueadero: "parking_spots",
  garajes: "parking_spots",
  garaje: "parking_spots",
  parking: "parking_spots",
  estrato: "stratum",
  stratum: "stratum",
  "nivel socioeconomico": "stratum",
  "area construida": "built_area_m2",
  "área construida": "built_area_m2",
  "area total": "built_area_m2",
  "built area": "built_area_m2",
  area: "built_area_m2",
  metros: "built_area_m2",
  "metros cuadrados": "built_area_m2",
  mt2: "built_area_m2",
  m2: "built_area_m2",
  "area privada": "private_area_m2",
  "área privada": "private_area_m2",
  "private area": "private_area_m2",
  "area terreno": "land_area_m2",
  "área terreno": "land_area_m2",
  "land area": "land_area_m2",
  "area del lote": "land_area_m2",
  "area lote": "land_area_m2",
  lote: "land_area_m2",
  "año": "year_built",
  ano: "year_built",
  "year built": "year_built",
  year: "year_built",
  antiguedad: "year_built",
  "antigüedad": "year_built",
  construccion: "year_built",
  "fecha construccion": "year_built",

  // Features
  caracteristicas: "features",
  "características": "features",
  features: "features",
  amenidades: "features",
  servicios: "features",
  extras: "features",
  dotacion: "features",
  "dotación": "features",

  // State
  estado: "property_status",
  status: "property_status",
  "estado del inmueble": "property_status",
  "estado inmueble": "property_status",
  disponibilidad: "availability",
  availability: "availability",

  // External code
  codigo: "external_code",
  "código": "external_code",
  code: "external_code",
  referencia: "external_code",
  ref: "external_code",
  id: "external_code",
  "id inmueble": "external_code",
  consecutivo: "external_code",

  // Owner info
  "nombre propietario": "owner_name",
  propietario: "owner_name",
  "movil propietario": "owner_phone",
  "telefono propietario": "owner_phone",
  "correo propietario": "owner_email",
  "email propietario": "owner_email",

  // Commission
  "valor comision": "commission_value",
  comision: "commission_value",
  "tipo de comision": "commission_type",
  "tipo comision": "commission_type",

  // Private notes
  notas: "private_notes",
  "comentario privado": "private_notes",
  "notas privadas": "private_notes",

  // Year built
  "ano construccion": "year_built",
  "año construccion": "year_built",
  "año de construccion": "year_built",

  // Images
  fotos: "images",
  imagenes: "images",
  "imágenes": "images",
  images: "images",
  photos: "images",
  fotografias: "images",
  "fotografías": "images",
  galeria: "images",
  "galería": "images",
};

// Common abbreviations in Colombian real estate exports
const ABBREVIATION_MAP: Record<string, string> = {
  habitac: "habitaciones",
  hab: "habitaciones",
  alcob: "alcobas",
  parq: "parqueaderos",
  gar: "garajes",
  admin: "administracion",
  dpto: "departamento",
  dir: "direccion",
  desc: "descripcion",
  caract: "caracteristicas",
  ant: "antiguedad",
  disp: "disponibilidad",
};

const PROPERTY_TYPE_MAP: Record<string, string> = {
  apartamento: "apartamento",
  apto: "apartamento",
  apartment: "apartamento",
  "apto.": "apartamento",
  casa: "casa",
  house: "casa",
  "casa campestre": "casa_campestre",
  finca: "finca",
  farm: "finca",
  apartaestudio: "apartaestudio",
  studio: "apartaestudio",
  duplex: "duplex",
  "dúplex": "duplex",
  penthouse: "penthouse",
  ph: "penthouse",
  local: "local",
  "local comercial": "local",
  oficina: "oficina",
  office: "oficina",
  lote: "lote",
  lot: "lote",
  terreno: "lote",
  bodega: "bodega",
  warehouse: "bodega",
  consultorio: "consultorio",
};

const BUSINESS_TYPE_MAP: Record<string, string> = {
  venta: "venta",
  vender: "venta",
  sale: "venta",
  compra: "venta",
  arriendo: "arriendo",
  arrendar: "arriendo",
  rent: "arriendo",
  alquiler: "arriendo",
  arrendamiento: "arriendo",
  "venta y arriendo": "venta_arriendo",
  "venta/arriendo": "venta_arriendo",
  "venta o arriendo": "venta_arriendo",
  "vender y arrendar": "venta_arriendo",
  "vender/arrendar": "venta_arriendo",
  ambos: "venta_arriendo",
  both: "venta_arriendo",
};

// ─── Numeric Cleaning ────────────────────────────────────────────

/**
 * Aggressively cleans numeric values from any Colombian/US format.
 * Handles: "$350.000.000", "85,5 m²", "COP 1.200.000", "350,000.50", etc.
 */
function cleanNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") return isFinite(value) ? value : null;

  let str = String(value).trim();

  // Remove currency symbols and unit suffixes
  str = str.replace(/^\$\s*/, "");
  str = str.replace(/^US\$\s*/i, "");
  str = str.replace(/^COP\s*/i, "");
  str = str.replace(/\s*m[²2]?\s*$/i, "");
  str = str.replace(/\s*ha\s*$/i, "");
  str = str.replace(/\s*mt[s2]?\s*$/i, "");
  str = str.trim();

  if (str === "" || str === "-" || str === "N/A" || str.toLowerCase() === "na") return null;

  // Detect Colombian format: dots as thousands separator
  // "350.000.000" or "1.200.000,50"
  const hasDotThousands = /^\d{1,3}(\.\d{3})+([,]\d{1,2})?$/.test(str);

  // Detect comma as decimal separator without dots: "85,5" or "120,75"
  const hasCommaDecimal = /^\d+,\d{1,2}$/.test(str);

  // Detect US format: commas as thousands, dot as decimal
  // "350,000,000" or "1,200,000.50"
  const hasCommaThousands = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str);

  if (hasDotThousands) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (hasCommaDecimal) {
    str = str.replace(",", ".");
  } else if (hasCommaThousands) {
    str = str.replace(/,/g, "");
  }

  // Remove any remaining non-numeric chars (except dot and minus)
  str = str.replace(/[^0-9.\-]/g, "");

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function toNumber(value: unknown): number {
  return cleanNumericValue(value) ?? 0;
}

function toNullableNumber(value: unknown): number | null {
  return cleanNumericValue(value);
}

// ─── Header Normalization ────────────────────────────────────────

/**
 * Normalizes a header string for fuzzy matching:
 * - lowercase, strip accents, strip parentheses/brackets, strip units, normalize abbreviations
 */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[()[\]{}<>]/g, "") // strip brackets/parentheses
    .replace(/m[²2]/gi, "") // strip m² / m2
    .replace(/mt[s2]?/gi, "") // strip mts, mt2
    .replace(/cop|usd|\$/gi, "") // strip currency markers
    .replace(/n[°o]\.?|#|num\.?/gi, "numero") // N°, #, Num → "numero"
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Expand abbreviations in a header using ABBREVIATION_MAP.
 * "habitac." → "habitaciones", "Hab" → "habitaciones"
 */
function expandAbbreviations(header: string): string {
  // Remove trailing dots (common in abbreviations)
  const cleaned = header.replace(/\.$/, "").trim();

  for (const [abbr, full] of Object.entries(ABBREVIATION_MAP)) {
    if (cleaned === abbr || cleaned.startsWith(abbr)) {
      return header.replace(new RegExp(abbr, "i"), full);
    }
  }
  return header;
}

// ─── Fuzzy Column Matching ───────────────────────────────────────

/**
 * Three-tier column matching:
 * 1. Exact match (fastest)
 * 2. Contains match (header contains a known key or vice versa)
 * 3. Abbreviation expansion + retry
 */
function matchColumn(
  rawHeader: string
): { field: string; confidence: "exact" | "contains" | "fuzzy" } | null {
  const trimmed = rawHeader.toLowerCase().trim();

  // Tier 1: Exact match
  if (COLUMN_MAP[trimmed]) {
    return { field: COLUMN_MAP[trimmed], confidence: "exact" };
  }

  // Tier 2: Contains match (after normalization)
  const normalized = normalizeHeader(rawHeader);

  // Direct lookup after normalization
  if (COLUMN_MAP[normalized]) {
    return { field: COLUMN_MAP[normalized], confidence: "exact" };
  }

  // Check if any COLUMN_MAP key is contained within the normalized header (longest match wins)
  // Require minimum 4 chars for contains matching to avoid false positives like "pais" → "area"
  let bestMatch: { key: string; field: string } | null = null;
  for (const [key, field] of Object.entries(COLUMN_MAP)) {
    const normalizedKey = normalizeHeader(key);
    // Skip very short keys for contains matching (too many false positives)
    if (normalizedKey.length < 4 && normalized.length < 4) continue;

    const headerContainsKey =
      normalizedKey.length >= 4 && normalized.includes(normalizedKey);
    const keyContainsHeader =
      normalized.length >= 4 && normalizedKey.includes(normalized);

    if (headerContainsKey || keyContainsHeader) {
      if (!bestMatch || key.length > bestMatch.key.length) {
        bestMatch = { key, field };
      }
    }
  }
  if (bestMatch) {
    return { field: bestMatch.field, confidence: "contains" };
  }

  // Tier 3: Abbreviation expansion
  const expanded = expandAbbreviations(normalized);
  if (expanded !== normalized) {
    if (COLUMN_MAP[expanded]) {
      return { field: COLUMN_MAP[expanded], confidence: "fuzzy" };
    }
    // Try contains again with expanded
    for (const [key, field] of Object.entries(COLUMN_MAP)) {
      const normalizedKey = normalizeHeader(key);
      if (expanded.includes(normalizedKey) || normalizedKey.includes(expanded)) {
        return { field, confidence: "fuzzy" };
      }
    }
  }

  return null;
}

// ─── All mappable fields (for manual override dropdown) ──────────

export const MAPPABLE_FIELDS: { value: string; label: string }[] = [
  { value: "title", label: "Título" },
  { value: "description", label: "Descripción" },
  { value: "property_type", label: "Tipo de inmueble" },
  { value: "business_type", label: "Tipo de negocio" },
  { value: "sale_price", label: "Precio venta" },
  { value: "rent_price", label: "Precio arriendo" },
  { value: "admin_fee", label: "Administración" },
  { value: "currency", label: "Moneda" },
  { value: "city", label: "Ciudad" },
  { value: "state_department", label: "Departamento" },
  { value: "zone", label: "Zona / Barrio" },
  { value: "address", label: "Dirección" },
  { value: "locality", label: "Localidad" },
  { value: "bedrooms", label: "Habitaciones" },
  { value: "bathrooms", label: "Baños" },
  { value: "parking_spots", label: "Parqueaderos" },
  { value: "stratum", label: "Estrato" },
  { value: "built_area_m2", label: "Área construida" },
  { value: "private_area_m2", label: "Área privada" },
  { value: "land_area_m2", label: "Área terreno" },
  { value: "year_built", label: "Año construcción" },
  { value: "features", label: "Características" },
  { value: "property_status", label: "Estado" },
  { value: "availability", label: "Disponibilidad" },
  { value: "external_code", label: "Código / Referencia" },
  { value: "owner_name", label: "Nombre propietario" },
  { value: "owner_phone", label: "Teléfono propietario" },
  { value: "owner_email", label: "Correo propietario" },
  { value: "commission_value", label: "Valor comisión" },
  { value: "commission_type", label: "Tipo comisión" },
  { value: "private_notes", label: "Notas privadas" },
  { value: "images", label: "Fotos / Imágenes" },
];

// ─── Excel Parsing ───────────────────────────────────────────────

export function parseExcelBuffer(buffer: ArrayBuffer): {
  rows: Record<string, unknown>[];
  sheetName: string;
  availableSheets: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array" });

  // Smart sheet selection: prefer sheets with property-related names
  const preferredNames = [
    "propiedades",
    "inmuebles",
    "properties",
    "datos",
    "listado",
    "inventario",
    "catalogo",
  ];
  let targetSheet = workbook.SheetNames[0];

  for (const name of workbook.SheetNames) {
    if (preferredNames.includes(name.toLowerCase().trim())) {
      targetSheet = name;
      break;
    }
  }

  const sheet = workbook.Sheets[targetSheet];
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  }) as Record<string, unknown>[];

  // Filter out completely empty rows
  const rows = rawRows.filter((row) =>
    Object.values(row).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    )
  );

  return {
    rows,
    sheetName: targetSheet,
    availableSheets: workbook.SheetNames,
  };
}

// ─── Column Mapping ──────────────────────────────────────────────

export function mapColumns(
  rawRows: Record<string, unknown>[],
  manualOverrides?: Record<string, string>
): {
  mappedRows: Record<string, unknown>[];
  columnMappings: ColumnMapping[];
  unmappedHeaders: string[];
} {
  if (rawRows.length === 0) {
    return { mappedRows: [], columnMappings: [], unmappedHeaders: [] };
  }

  const rawHeaders = Object.keys(rawRows[0]);
  const columnMappings: ColumnMapping[] = [];
  const unmappedHeaders: string[] = [];
  const headerToField: Record<string, string> = {};

  // Track which fields are already mapped to avoid duplicates
  const mappedFields = new Set<string>();

  for (const header of rawHeaders) {
    // Check manual overrides first
    if (manualOverrides?.[header] && manualOverrides[header] !== "_ignore") {
      const field = manualOverrides[header];
      if (!mappedFields.has(field)) {
        columnMappings.push({
          rawHeader: header,
          mappedField: field,
          confidence: "exact",
        });
        headerToField[header] = field;
        mappedFields.add(field);
        continue;
      }
    }

    const match = matchColumn(header);
    if (match && !mappedFields.has(match.field)) {
      columnMappings.push({
        rawHeader: header,
        mappedField: match.field,
        confidence: match.confidence,
      });
      headerToField[header] = match.field;
      mappedFields.add(match.field);
    } else if (!manualOverrides?.[header] || manualOverrides[header] !== "_ignore") {
      unmappedHeaders.push(header);
    }
  }

  const mappedRows = rawRows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [rawKey, mappedKey] of Object.entries(headerToField)) {
      mapped[mappedKey] = row[rawKey];
    }
    return mapped;
  });

  return { mappedRows, columnMappings, unmappedHeaders };
}

// ─── Value Normalization ─────────────────────────────────────────

function normalizePropertyType(value: unknown): string {
  if (!value) return "apartamento";
  const normalized = String(value).toLowerCase().trim();
  return PROPERTY_TYPE_MAP[normalized] || "apartamento";
}

function normalizeBusinessType(value: unknown): string {
  if (!value) return "venta";
  const normalized = String(value).toLowerCase().trim();
  return BUSINESS_TYPE_MAP[normalized] || "venta";
}

const AVAILABILITY_MAP: Record<string, string> = {
  disponible: "disponible",
  activo: "disponible",
  vendido: "vendido",
  arrendado: "arrendado",
  reservado: "reservado",
  inactivo: "no_disponible",
  "no disponible": "no_disponible",
};

function normalizeAvailability(value: unknown): string {
  if (!value) return "disponible";
  const normalized = String(value).toLowerCase().trim();
  return AVAILABILITY_MAP[normalized] || "disponible";
}

const PROPERTY_STATUS_MAP: Record<string, string> = {
  usado: "usado",
  nuevo: "nuevo",
  "sobre planos": "sobre_planos",
  "en construccion": "en_construccion",
  remodelado: "remodelado",
};

function normalizePropertyStatus(value: unknown): string {
  if (!value) return "usado";
  const normalized = String(value).toLowerCase().trim();
  return PROPERTY_STATUS_MAP[normalized] || "usado";
}

function parseFeatures(value: unknown): string[] {
  if (!value) return [];
  const str = String(value);
  // Split on comma, semicolon, pipe, or newline
  return str
    .split(/[,;|\n]+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

/**
 * Parse image URLs from a pipe/comma/semicolon/newline-delimited string.
 * Only keeps valid http(s) URLs.
 */
function parseImageUrls(value: unknown): string[] {
  if (!value) return [];
  const str = String(value).trim();
  if (!str) return [];

  return str
    .split(/[|,;\n]+/)
    .map((url) => url.trim())
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"));
}

// ─── Validation & Transformation ─────────────────────────────────

export function validateAndTransformRows(
  mappedRows: Record<string, unknown>[]
): ImportRow[] {
  return mappedRows.map((row, idx) => {
    const errors: string[] = [];
    const title = String(row.title || "").trim();

    if (!title || title.length < 3) {
      errors.push("Título es requerido (mínimo 3 caracteres)");
    }

    const propertyType = normalizePropertyType(row.property_type);
    const businessType = normalizeBusinessType(row.business_type);

    const property: PropertyInsertData = {
      title: { es: title || "Sin título" },
      description: row.description ? { es: String(row.description) } : null,
      slug: generateUniqueSlug(title || "propiedad"),
      property_type: propertyType,
      business_type: businessType,
      property_status: normalizePropertyStatus(row.property_status),
      availability: normalizeAvailability(row.availability),
      sale_price: toNumber(row.sale_price),
      rent_price: toNumber(row.rent_price),
      currency: String(row.currency || "COP").toUpperCase(),
      admin_fee: toNumber(row.admin_fee),
      city: row.city ? String(row.city).trim() : null,
      state_department: row.state_department
        ? String(row.state_department).trim()
        : null,
      zone: row.zone ? String(row.zone).trim() : null,
      address: row.address ? String(row.address).trim() : null,
      locality: row.locality ? String(row.locality).trim() : null,
      built_area_m2: toNullableNumber(row.built_area_m2),
      private_area_m2: toNullableNumber(row.private_area_m2),
      land_area_m2: toNullableNumber(row.land_area_m2),
      bedrooms: toNumber(row.bedrooms),
      bathrooms: toNumber(row.bathrooms),
      parking_spots: toNumber(row.parking_spots),
      stratum: toNullableNumber(row.stratum),
      year_built: toNullableNumber(row.year_built),
      features: parseFeatures(row.features),
      is_published: true,
      is_featured: false,
      external_code: row.external_code
        ? String(row.external_code).trim()
        : null,
      owner_name: row.owner_name ? String(row.owner_name).trim() : null,
      owner_phone: row.owner_phone ? String(row.owner_phone).trim() : null,
      owner_email: row.owner_email ? String(row.owner_email).trim() : null,
      commission_value: toNullableNumber(row.commission_value),
      commission_type: row.commission_type
        ? String(row.commission_type).toLowerCase().trim()
        : "percent",
      private_notes: row.private_notes
        ? String(row.private_notes).trim()
        : null,
      images: parseImageUrls(row.images),
    };

    return {
      rowNumber: idx + 2, // +2 for 1-based + header row
      data: row,
      errors,
      property: errors.length === 0 ? property : undefined,
    };
  });
}

// ─── Duplicate Detection ─────────────────────────────────────────

export function generatePropertyFingerprint(row: PropertyInsertData): string {
  const parts = [
    row.title.es.toLowerCase().trim(),
    row.city?.toLowerCase().trim() ?? "",
    String(row.built_area_m2 ?? ""),
    String(row.sale_price || row.rent_price),
    row.external_code?.toLowerCase().trim() ?? "",
  ];
  return parts.join("|");
}

export function detectDuplicatesInFile(rows: ImportRow[]): Set<number> {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();

  for (const row of rows) {
    if (!row.property) continue;
    const fp = generatePropertyFingerprint(row.property);
    if (seen.has(fp)) {
      duplicates.add(row.rowNumber);
    } else {
      seen.set(fp, row.rowNumber);
    }
  }

  return duplicates;
}

// ─── Full Preview Pipeline ───────────────────────────────────────

export function generateImportPreview(
  buffer: ArrayBuffer,
  manualOverrides?: Record<string, string>
): ImportPreview {
  const { rows: rawRows, sheetName, availableSheets } =
    parseExcelBuffer(buffer);

  const { mappedRows, columnMappings, unmappedHeaders } = mapColumns(
    rawRows,
    manualOverrides
  );

  const importRows = validateAndTransformRows(mappedRows);
  const duplicates = detectDuplicatesInFile(importRows);

  // Mark duplicates as errors
  for (const row of importRows) {
    if (duplicates.has(row.rowNumber)) {
      row.errors.push("Posible duplicado dentro del archivo");
      row.property = undefined;
    }
  }

  const validCount = importRows.filter((r) => r.property).length;
  const errorCount = importRows.filter((r) => r.errors.length > 0).length;

  // Sample data: first 5 transformed rows for preview table
  const sampleData = importRows.slice(0, 5).map((r) => {
    if (r.property) {
      return {
        titulo: r.property.title.es,
        tipo: r.property.property_type,
        negocio: r.property.business_type,
        precio:
          r.property.sale_price || r.property.rent_price || 0,
        ciudad: r.property.city || "—",
        area: r.property.built_area_m2 ?? "—",
        hab: r.property.bedrooms,
        banos: r.property.bathrooms,
        fotos: r.property.images.length,
      };
    }
    return {
      titulo: String(r.data.title || "—"),
      tipo: "—",
      negocio: "—",
      precio: 0,
      ciudad: "—",
      area: "—",
      hab: 0,
      banos: 0,
      fotos: 0,
      _error: true,
    };
  });

  return {
    rows: importRows,
    columnMappings,
    unmappedHeaders,
    sheetName,
    availableSheets,
    totalRows: rawRows.length,
    validCount,
    errorCount,
    duplicateCount: duplicates.size,
    sampleData,
  };
}
