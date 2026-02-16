import * as XLSX from "xlsx";
import { generateSlug } from "@/lib/utils/slug";

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
}

// Wasi column mapping (common Colombian real estate export format)
const COLUMN_MAP: Record<string, string> = {
  // Title
  titulo: "title",
  título: "title",
  nombre: "title",
  name: "title",
  title: "title",

  // Description
  descripcion: "description",
  descripción: "description",
  description: "description",

  // Property type
  tipo: "property_type",
  "tipo de inmueble": "property_type",
  "tipo inmueble": "property_type",
  type: "property_type",
  "property type": "property_type",

  // Business type
  negocio: "business_type",
  "tipo de negocio": "business_type",
  "tipo negocio": "business_type",
  operacion: "business_type",
  operación: "business_type",

  // Pricing
  "precio venta": "sale_price",
  "precio de venta": "sale_price",
  venta: "sale_price",
  "sale price": "sale_price",
  price: "sale_price",
  precio: "sale_price",
  "precio arriendo": "rent_price",
  "precio de arriendo": "rent_price",
  arriendo: "rent_price",
  "rent price": "rent_price",
  canon: "rent_price",
  administracion: "admin_fee",
  administración: "admin_fee",
  "admin fee": "admin_fee",
  moneda: "currency",
  currency: "currency",

  // Location
  ciudad: "city",
  city: "city",
  departamento: "state_department",
  state: "state_department",
  zona: "zone",
  barrio: "zone",
  sector: "zone",
  zone: "zone",
  direccion: "address",
  dirección: "address",
  address: "address",
  localidad: "locality",

  // Specs
  habitaciones: "bedrooms",
  alcobas: "bedrooms",
  bedrooms: "bedrooms",
  rooms: "bedrooms",
  "baños": "bathrooms",
  banos: "bathrooms",
  bathrooms: "bathrooms",
  parqueaderos: "parking_spots",
  garajes: "parking_spots",
  parking: "parking_spots",
  estrato: "stratum",
  stratum: "stratum",
  "area construida": "built_area_m2",
  "área construida": "built_area_m2",
  "area total": "built_area_m2",
  "built area": "built_area_m2",
  "area privada": "private_area_m2",
  "área privada": "private_area_m2",
  "private area": "private_area_m2",
  "area terreno": "land_area_m2",
  "área terreno": "land_area_m2",
  "land area": "land_area_m2",
  "año": "year_built",
  "ano": "year_built",
  "year built": "year_built",
  antiguedad: "year_built",
  antigüedad: "year_built",

  // Features
  caracteristicas: "features",
  características: "features",
  features: "features",

  // State
  estado: "property_status",
  status: "property_status",
  disponibilidad: "availability",
  availability: "availability",

  // External code
  codigo: "external_code",
  código: "external_code",
  code: "external_code",
  referencia: "external_code",
  ref: "external_code",
};

const PROPERTY_TYPE_MAP: Record<string, string> = {
  apartamento: "apartamento",
  apto: "apartamento",
  apartment: "apartamento",
  casa: "casa",
  house: "casa",
  "casa campestre": "casa_campestre",
  finca: "finca",
  farm: "finca",
  apartaestudio: "apartaestudio",
  studio: "apartaestudio",
  duplex: "duplex",
  dúplex: "duplex",
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
  sale: "venta",
  arriendo: "arriendo",
  rent: "arriendo",
  alquiler: "arriendo",
  "venta y arriendo": "venta_arriendo",
  "venta/arriendo": "venta_arriendo",
  ambos: "venta_arriendo",
  both: "venta_arriendo",
};

export function parseExcelBuffer(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet);
}

export function mapColumns(
  rawRows: Record<string, unknown>[]
): { mappedRows: Record<string, unknown>[]; detectedColumns: Record<string, string> } {
  if (rawRows.length === 0) return { mappedRows: [], detectedColumns: {} };

  const rawHeaders = Object.keys(rawRows[0]);
  const detectedColumns: Record<string, string> = {};

  for (const header of rawHeaders) {
    const normalized = header.toLowerCase().trim();
    const mapped = COLUMN_MAP[normalized];
    if (mapped) {
      detectedColumns[header] = mapped;
    }
  }

  const mappedRows = rawRows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [rawKey, mappedKey] of Object.entries(detectedColumns)) {
      mapped[mappedKey] = row[rawKey];
    }
    return mapped;
  });

  return { mappedRows, detectedColumns };
}

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

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

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
      slug: generateSlug(title || "propiedad"),
      property_type: propertyType,
      business_type: businessType,
      property_status: "usado",
      availability: "disponible",
      sale_price: toNumber(row.sale_price),
      rent_price: toNumber(row.rent_price),
      currency: String(row.currency || "COP").toUpperCase(),
      admin_fee: toNumber(row.admin_fee),
      city: row.city ? String(row.city) : null,
      state_department: row.state_department ? String(row.state_department) : null,
      zone: row.zone ? String(row.zone) : null,
      address: row.address ? String(row.address) : null,
      locality: row.locality ? String(row.locality) : null,
      built_area_m2: toNullableNumber(row.built_area_m2),
      private_area_m2: toNullableNumber(row.private_area_m2),
      land_area_m2: toNullableNumber(row.land_area_m2),
      bedrooms: toNumber(row.bedrooms),
      bathrooms: toNumber(row.bathrooms),
      parking_spots: toNumber(row.parking_spots),
      stratum: toNullableNumber(row.stratum),
      year_built: toNullableNumber(row.year_built),
      features: row.features
        ? String(row.features).split(",").map((f) => f.trim()).filter(Boolean)
        : [],
      is_published: true,
      is_featured: false,
      external_code: row.external_code ? String(row.external_code) : null,
    };

    return {
      rowNumber: idx + 2, // +2 for 1-based + header row
      data: row,
      errors,
      property: errors.length === 0 ? property : undefined,
    };
  });
}
