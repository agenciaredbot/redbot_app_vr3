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
  detail_url?: string | null;
}

export interface ExtractionResult {
  properties: PropertyInsertData[];
  detailUrls: (string | null)[];
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
): { text: string; links: string[]; images: string[] } {
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

  // Collect all image URLs before stripping HTML
  const imageSet = new Set<string>();
  $("img[src], img[data-src], img[data-lazy-src], img[data-original]").each((_, el) => {
    const src =
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-original") ||
      $(el).attr("src") ||
      "";
    if (!src) return;
    try {
      const absoluteUrl = new URL(src, baseUrl).toString();
      // Filter out tiny icons, tracking pixels, and placeholder images
      if (
        absoluteUrl.match(/\.(jpg|jpeg|png|webp)/i) &&
        !absoluteUrl.includes("placeholder") &&
        !absoluteUrl.includes("pixel") &&
        !absoluteUrl.includes("1x1") &&
        !absoluteUrl.includes("logo")
      ) {
        imageSet.add(absoluteUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  // Also check srcset for responsive images
  $("img[srcset], source[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset") || "";
    // Parse srcset: "url1 300w, url2 600w, ..."
    const entries = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]);
    for (const src of entries) {
      if (!src) continue;
      try {
        const absoluteUrl = new URL(src, baseUrl).toString();
        if (absoluteUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
          imageSet.add(absoluteUrl);
        }
      } catch {
        // skip
      }
    }
  });

  // Replace img tags with a text marker so Claude can associate images with properties
  $("img").each((_, el) => {
    const src =
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-original") ||
      $(el).attr("src") ||
      "";
    const alt = $(el).attr("alt") || "";
    if (src) {
      try {
        const absoluteUrl = new URL(src, baseUrl).toString();
        $(el).replaceWith(`[IMG: ${absoluteUrl} | ${alt}]`);
      } catch {
        $(el).remove();
      }
    }
  });

  // Get text content, preserving some structure
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

  return { text, links, images: Array.from(imageSet) };
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
  images: string[];
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
    return { text: jinaText, links: [], images: [], usedFallback: true };
  } finally {
    clearTimeout(timeout);
  }

  // Clean the HTML (also extracts image URLs)
  const { text, links, images } = cleanHtml(html, url);

  // If cleaned text is too short, the page likely needs JS rendering
  if (text.length < 500) {
    try {
      const jinaText = await fetchWithJinaFallback(url);
      if (jinaText.length > text.length) {
        return { text: jinaText, links: [], images, usedFallback: true };
      }
    } catch {
      // Jina also failed, use what we have
    }
  }

  return { text, links, images, usedFallback };
}

// ─── Claude AI Extraction ─────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a real estate data extraction specialist for the Colombian market.
You receive text content from a real estate website page and must extract all property listings into structured JSON.
Always respond with ONLY a valid JSON object — no markdown, no explanation.`;

function buildExtractionPrompt(text: string, url: string, pageNumber: number, pageImages: string[]): string {
  // Include available images so Claude can associate them to properties
  const imageSection = pageImages.length > 0
    ? `\nAVAILABLE IMAGES FOUND ON PAGE (${pageImages.length} total):\n${pageImages.join("\n")}\n`
    : "";

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
      "images": ["absolute image URLs - max 10 per property"],
      "detail_url": "absolute URL to this property's detail/individual page, or null"
    }
  ],
  "nextPageUrl": "absolute URL of next page of listings, or null"
}

Rules:
- Extract EVERY property listing on this page. Do not skip any.
- Prices in COP. Remove dots/commas as thousands separators: "$350.000.000" = 350000000
- If "Arriendo" set rent_price, if "Venta" set sale_price. If both, set both.
- Map: "Apto" = apartamento, "Casa" = casa, "Finca" = finca, etc.
- IMAGES: Associate images to each property using [IMG: url | alt] markers in the text AND the AVAILABLE IMAGES list. Match images to the property they appear near in the page. Maximum 10 images per property. Only include real property photos (not icons, logos, or UI elements).
- DETAIL URL: For each property, extract the link to its individual detail page (the page where you can see the full listing with all images). This is usually the link wrapping the property card/title.
- Make all image URLs absolute using base URL: ${url}
- For nextPageUrl: find pagination links (Siguiente, Next, page numbers, >>). Return full absolute URL or null.
- If a field is unknown, use null or 0.
- Return ONLY the JSON object.
${imageSection}
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
  pageNumber: number,
  pageImages: string[] = []
): Promise<ExtractionResult> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16384,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildExtractionPrompt(text, url, pageNumber, pageImages),
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
    return { properties: [], detailUrls: [], nextPageUrl: null, siteTitle: "Error de extracción" };
  }

  const rawProperties = (parsed.properties || []).filter((p) => p.title && p.title.length >= 3);

  // Convert raw properties to PropertyInsertData
  const properties: PropertyInsertData[] = rawProperties.map((raw) => rawToPropertyInsertData(raw));

  // Extract detail URLs for image enrichment
  const detailUrls = rawProperties.map((raw) => raw.detail_url || null);

  return {
    properties,
    detailUrls,
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
    images: (raw.images || [])
      .filter((url) => url.startsWith("http://") || url.startsWith("https://"))
      .slice(0, 10),
  };
}

// ─── Image Enrichment from Detail Pages ──────────────────────────

const MAX_IMAGES_PER_PROPERTY = 10;
const IMAGE_FETCH_TIMEOUT = 8_000;
const MAX_CONCURRENT_FETCHES = 5;

/**
 * Extract all property-relevant images from a detail page HTML using cheerio.
 * No Claude needed — just parses img/source tags.
 */
function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $("script, style, noscript, iframe, nav, footer, header").remove();

  const imageSet = new Set<string>();

  // Standard img tags with various lazy-loading attributes
  $("img[src], img[data-src], img[data-lazy-src], img[data-original], img[data-lazy], img[data-image]").each((_, el) => {
    const src =
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-original") ||
      $(el).attr("data-lazy") ||
      $(el).attr("data-image") ||
      $(el).attr("src") ||
      "";
    addImageUrl(src, baseUrl, imageSet);
  });

  // Srcset
  $("img[srcset], source[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset") || "";
    const entries = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]);
    for (const src of entries) {
      if (src) addImageUrl(src, baseUrl, imageSet);
    }
  });

  // Background images in inline styles (common in galleries)
  $("[style*='background-image']").each((_, el) => {
    const style = $(el).attr("style") || "";
    const match = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
    if (match?.[1]) addImageUrl(match[1], baseUrl, imageSet);
  });

  // Links to images (lightbox galleries)
  $("a[href$='.jpg'], a[href$='.jpeg'], a[href$='.png'], a[href$='.webp'], a[data-fancybox], a[data-lightbox]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href) addImageUrl(href, baseUrl, imageSet);
  });

  return Array.from(imageSet).slice(0, MAX_IMAGES_PER_PROPERTY);
}

function addImageUrl(src: string, baseUrl: string, imageSet: Set<string>): void {
  if (!src || src.startsWith("data:")) return;
  try {
    const absoluteUrl = new URL(src, baseUrl).toString();
    if (
      absoluteUrl.match(/\.(jpg|jpeg|png|webp)/i) &&
      !absoluteUrl.includes("placeholder") &&
      !absoluteUrl.includes("pixel") &&
      !absoluteUrl.includes("1x1") &&
      !absoluteUrl.includes("logo") &&
      !absoluteUrl.includes("icon") &&
      !absoluteUrl.includes("favicon") &&
      !absoluteUrl.includes("avatar") &&
      !absoluteUrl.includes("banner") &&
      !absoluteUrl.includes("sprite")
    ) {
      imageSet.add(absoluteUrl);
    }
  } catch {
    // Invalid URL
  }
}

/**
 * Fetch a single detail page and extract images.
 */
async function fetchDetailPageImages(detailUrl: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT);

  try {
    const response = await fetch(detailUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    return extractImagesFromHtml(html, detailUrl);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Enrich properties with images from their detail pages.
 * Fetches detail pages in parallel (batched) and extracts images with cheerio.
 * Only enriches properties that have a detail_url and fewer than 2 images.
 */
export async function enrichPropertyImages(
  properties: PropertyInsertData[],
  detailUrls: (string | null)[]
): Promise<PropertyInsertData[]> {
  // Build list of properties that need image enrichment
  const toEnrich: { index: number; url: string }[] = [];

  for (let i = 0; i < properties.length; i++) {
    const url = detailUrls[i];
    const currentImages = properties[i].images?.length ?? 0;
    if (url && currentImages < 2) {
      toEnrich.push({ index: i, url });
    }
  }

  if (toEnrich.length === 0) return properties;

  console.log(`[scraper] Enriching images for ${toEnrich.length} properties from detail pages`);

  // Process in batches to avoid overwhelming the target server
  const enriched = [...properties];

  for (let batch = 0; batch < toEnrich.length; batch += MAX_CONCURRENT_FETCHES) {
    const chunk = toEnrich.slice(batch, batch + MAX_CONCURRENT_FETCHES);

    const results = await Promise.allSettled(
      chunk.map(({ url }) => fetchDetailPageImages(url))
    );

    for (let j = 0; j < chunk.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value.length > 0) {
        // Merge: keep existing images, add new ones (dedup by URL)
        const existing = new Set(enriched[chunk[j].index].images || []);
        const newImages = result.value.filter((img) => !existing.has(img));
        enriched[chunk[j].index] = {
          ...enriched[chunk[j].index],
          images: [...Array.from(existing), ...newImages].slice(0, MAX_IMAGES_PER_PROPERTY),
        };
      }
    }
  }

  const enrichedCount = toEnrich.filter((_, i) => {
    const result = enriched[toEnrich[i]?.index];
    return result && (result.images?.length ?? 0) > 1;
  }).length;
  console.log(`[scraper] Image enrichment complete: ${enrichedCount}/${toEnrich.length} properties got more images`);

  return enriched;
}
