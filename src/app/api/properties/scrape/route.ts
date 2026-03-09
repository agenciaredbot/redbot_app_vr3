import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { checkLimit } from "@/lib/plans/feature-gate";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { validateScrapeUrl } from "@/lib/scraper/url-validator";
import {
  fetchPageContent,
  extractWithClaude,
} from "@/lib/scraper/extract-properties";

export const maxDuration = 55; // Vercel timeout slightly under 60s

export async function POST(request: NextRequest) {
  // Auth check
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  // Rate limit
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip, RATE_LIMITS.scrape);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento antes de continuar." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { url, pageNumber = 1 } = body as {
      url: string;
      pageNumber?: number;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL es requerida." },
        { status: 400 }
      );
    }

    // Validate URL (SSRF prevention)
    const validation = validateScrapeUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check plan limit before spending Claude tokens
    const limitCheck = await checkLimit(organizationId, "properties");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Has alcanzado el límite de propiedades de tu plan (${limitCheck.max}).` },
        { status: 403 }
      );
    }

    console.log(`[scrape] Fetching page ${pageNumber}: ${validation.sanitizedUrl}`);

    // Step 1: Fetch and clean page content
    let pageContent: { text: string; links: string[]; usedFallback: boolean };
    try {
      pageContent = await fetchPageContent(validation.sanitizedUrl);
    } catch (err) {
      console.error("[scrape] Fetch failed:", err);
      return NextResponse.json(
        { error: "No se pudo acceder al sitio web. Verifica la URL e intenta de nuevo." },
        { status: 422 }
      );
    }

    if (!pageContent.text || pageContent.text.length < 100) {
      return NextResponse.json(
        { error: "No se pudo extraer contenido de la página. El sitio puede requerir JavaScript o bloquear el acceso automático." },
        { status: 422 }
      );
    }

    console.log(`[scrape] Content fetched: ${pageContent.text.length} chars, fallback=${pageContent.usedFallback}`);

    // Step 2: Extract properties with Claude AI
    let result;
    try {
      result = await extractWithClaude(
        pageContent.text,
        validation.sanitizedUrl,
        pageNumber
      );
    } catch (err) {
      console.error("[scrape] Claude extraction failed:", err);
      return NextResponse.json(
        { error: "Error al procesar la página con IA. Intenta de nuevo." },
        { status: 500 }
      );
    }

    console.log(`[scrape] Extracted ${result.properties.length} properties, nextPage=${result.nextPageUrl ? "yes" : "no"}`);

    return NextResponse.json({
      properties: result.properties,
      nextPageUrl: result.nextPageUrl,
      pageNumber,
      totalExtracted: result.properties.length,
      siteTitle: result.siteTitle,
    });
  } catch (err) {
    console.error("[scrape] Unexpected error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
