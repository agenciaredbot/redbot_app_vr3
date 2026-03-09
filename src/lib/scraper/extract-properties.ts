import * as cheerio from "cheerio";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { generateUniqueSlug } from "@/lib/utils/slug";
import {
  normalizePropertyType,
  normalizeBusinessType,
  normalizePropertyStatus,
  normalizeAvailability,
  type PropertyInsertData,
} from "@/lib/utils/property-import";

// ─── Types ───────────────────────────────────────────────────────

export interface RawExtractedProperty {
  title: string;
  description?: string | null;
  property_type?: string;
  business_type?: string;
  property_status?: string;
  sale_price?: number;
  rent_price?: number;
  currency?: string;
  admin_fee?: number;
  city?: string | null;
  state_department?: string | null;
  zone?: string | null;
  address?: string | null;
  built_area_m2?: number | null;
  private_area_m2?: number | null;
  land_area_m2?: number | null;
  bedrooms?: number;
  bathrooms?: number;
  parking_spots?: number;
  stratum?: number | null;
  year_built?: number | null;
  features?: string[];
  external_code?: string | null;
  images?: string[];
}

export interface ExtractionResult {
  properties: PropertyInsertData[];
  nextPageUrl: string | null;
  siteTitle: string;
}

// ─── HTML Cleaning ────────────────────────────────────────────────

const REMOVE_SELECTORS = [
  "script", "style", "noscript", "iframe", "svg",
  "nav", "footer", "header",
  ".cookie-banner", ".cookie-consent", ".popup", ".modal",
  ".advertisement", ".ad-container", ".sidebar",
  "[role='navigation']", "[role='banner']", "[role='contentinfo']",
];

/**
 * Clean HTML: strip scripts, styles, nav, ads, etc.
 * Returns text content preserving structure + all links on the page.
 */
export function cleanHtml(
  html: string,
  baseUrl: string
): { text: string; links: string[] } {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  for (const selector of REMOVE_SELECTORS) {
    $(selector).remove();
  }

  // Collect all links (for pagination detection)
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        links.push(absoluteUrl);
      } catch {
        // Invalid URL, skip
      }
    }
  });

  // Get text content, preserving some structure
  // Replace block elements with newlines for readability
  $("br").replaceWith("\n");
  $("p, div, li, h1, h2, h3, h4, h5, h6, tr").each((_, el) => {
    $(el).prepend("\n");
    $(el).append("\n");
  });

  let text = $("body").text() || $.text();

  // Clean up whitespace
  text = text
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Truncate to ~60K chars to fit Claude's context window
  const MAX_CHARS = 60_000;
  if (text.length > MAX_CHARS) {
    text = text.substring(0, MAX_CHARS) + "\n\n[... contenido truncado ...]";
  }

  return { text, links };
}

// ─── Jina Reader Fallback ─────────────────────────────────────────

/**
 * Use Jina Reader API to render JS-heavy pages and get clean text.
 * Free tier: 30 RPM.
 */
export async function fetchWithJinaFallback(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/plain",
      },
    });

    if (!response.ok) {
      throw new Error(`Jina returned ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Fetch Page HTML ──────────────────────────────────────────────

/**
 * Fetch a URL's HTML with timeout and realistic headers.
 * Falls back to Jina Reader for JS-rendered pages.
 */
export async function fetchPageContent(url: string): Promise<{
  text: string;
  links: string[];
  usedFallback: boolean;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let html: string;
  let usedFallback = false;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("Not HTML content");
    }

    html = await response.text();
  } catch {
    // Primary fetch failed — try Jina Reader
    const jinaText = await fetchWithJinaFallback(url);
    return { text: jinaText, links: [], usedFallback: true };
  } finally {
    clearTimeout(timeout);
  }

  // Clean the HTML
  const { text, links } = cleanHtml(html, url);

  // If cleaned text is too short, the page likely needs JS rendering
  if (text.length < 500) {
    try {
      const jinaText = await fetchWithJinaFallback(url);
      if (jinaText.length > text.length) {
        return { text: jinaText, links: [], usedFallback: true };
      }
    } catch {
      // Jina also failed, use what we have
    }
  }

  return { text, links, usedFallback };
}

// ─── Claude AI Extraction ─────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a real estate data extraction specialist for the Colombian market.
You receive text content from a real estate website page and must extract all property listings into structured JSON.
Always respond with ONLY a valid JSON object — no markdown, no explanation.`;

function buildExtractionPrompt(text: string, url: string, pageNumber: number): string {
  return `Extract ALL property listings from this real estate website page.
URL: ${url} (page ${pageNumber})

Return a JSON object with this exact structure:
{
  "siteTitle": "Brief description of the site/page",
  "properties": [
    {
      "title": "string - property title",
      "description": "string or null",
      "property_type": "one of: apartamento, casa, casa_campestre, apartaestudio, duplex, penthouse, local, oficina, lote, finca, bodega, consultorio",
      "business_type": "one of: venta, arriendo, venta_arriendo",
      "property_status": "one of: nuevo, usado, en_construccion, sobre_planos, remodelado",
      "sale_price": number or 0,
      "rent_price": number or 0,
      "currency": "COP",
      "admin_fee": number or 0,
      "city": "string or null",
      "state_department": "string or null (Colombian departamento)",
      "zone": "string or null (barrio/sector)",
      "address": "string or null",
      "built_area_m2": number or null,
      "private_area_m2": number or null,
      "land_area_m2": number or null,
      "bedrooms": number or 0,
      "bathrooms": number or 0,
      "parking_spots": number or 0,
      "stratum": number or null (1-6),
      "year_built": number or null,
      "features": ["amenities/features array"],
      "external_code": "string or null - property code/reference on the site",
      "images": ["absolute image URLs"]
    }
  ],
  "nextPageUrl": "absolute URL of next page of listings, or null"
}

Rules:
- Extract EVERY property listing on this page. Do not skip any.
- Prices in COP. Remove dots/commas as thousands separators: "$350.000.000" = 350000000
- If "Arriendo" set rent_price, if "Venta" set sale_price. If both, set both.
- Map: "Apto" = apartamento, "Casa" = casa, "Finca" = finca, etc.
- Make image URLs absolute using base URL: ${url}
- For nextPageUrl: find pagination links (Siguiente, Next, page numbers, >>). Return full absolute URL or null.
- If a field is unknown, use null or 0.
- Return ONLY the JSON object.

PAGE CONTENT:
---
${text}
---`;
}

/**
 * Send cleaned text to Claude for property extraction.
 */
export async function extractWithClaude(
  text: string,
  url: string,
  pageNumber: number
): Promise<ExtractionResult> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildExtractionPrompt(text, url, pageNumber),
      },
    ],
  });

  // Extract text from response
  const responseText = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("");

  // Parse JSON (handle potential markdown code fences)
  const jsonStr = responseText
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();

  let parsed: {
    siteTitle?: string;
    properties?: RawExtractedProperty[];
    nextPageUrl?: string | null;
  };

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("[scraper] Failed to parse Claude response:", jsonStr.substring(0, 200));
    return { properties: [], nextPageUrl: null, siteTitle: "Error de extracción" };
  }

  // Convert raw properties to PropertyInsertData
  const properties: PropertyInsertData[] = (parsed.properties || [])
    .filter((p) => p.title && p.title.length >= 3)
    .map((raw) => rawToPropertyInsertData(raw));

  return {
    properties,
    nextPageUrl: parsed.nextPageUrl || null,
    siteTitle: parsed.siteTitle || new URL(url).hostname,
  };
}

// ─── Raw → PropertyInsertData Conversion ───────────────────────────

function rawToPropertyInsertData(raw: RawExtractedProperty): PropertyInsertData {
  const title = (raw.title || "Sin título").trim();

  return {
    title: { es: title },
    description: raw.description ? { es: raw.description } : null,
    slug: generateUniqueSlug(title),
    property_type: normalizePropertyType(raw.property_type),
    business_type: normalizeBusinessType(raw.business_type),
    property_status: normalizePropertyStatus(raw.property_status),
    availability: "disponible",
    sale_price: raw.sale_price || 0,
    rent_price: raw.rent_price || 0,
    currency: raw.currency || "COP",
    admin_fee: raw.admin_fee || 0,
    city: raw.city || null,
    state_department: raw.state_department || null,
    zone: raw.zone || null,
    address: raw.address || null,
    locality: null,
    built_area_m2: raw.built_area_m2 ?? null,
    private_area_m2: raw.private_area_m2 ?? null,
    land_area_m2: raw.land_area_m2 ?? null,
    bedrooms: raw.bedrooms || 0,
    bathrooms: raw.bathrooms || 0,
    parking_spots: raw.parking_spots || 0,
    stratum: raw.stratum ?? null,
    year_built: raw.year_built ?? null,
    features: raw.features || [],
    is_published: true,
    is_featured: false,
    external_code: raw.external_code || null,
    owner_name: null,
    owner_phone: null,
    owner_email: null,
    commission_value: null,
    commission_type: "percent",
    private_notes: null,
    images: (raw.images || []).filter(
      (url) => url.startsWith("http://") || url.startsWith("https://")
    ),
  };
}
