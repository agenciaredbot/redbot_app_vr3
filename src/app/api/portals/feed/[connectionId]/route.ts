import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateProppitXml } from "@/lib/portals/adapters/xml-feed";
import type { PortalPropertyData } from "@/lib/portals/types";

/**
 * GET /api/portals/feed/[connectionId]
 *
 * Public endpoint that serves a Proppit-compatible XML feed.
 * No auth required — the connectionId acts as a unique token.
 *
 * Proppit (Lifull Connect) crawls this URL to sync listings
 * across Properati, Trovit, Mitula, Nestoria, Nuroa, etc.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await params;

  const supabase = createAdminClient();

  // 1. Fetch the portal connection
  const { data: connection, error: connError } = await supabase
    .from("portal_connections")
    .select("id, organization_id, portal_slug, is_active")
    .eq("id", connectionId)
    .single();

  if (!connection || connError) {
    return new NextResponse("Feed not found", { status: 404 });
  }

  if (!connection.is_active) {
    return new NextResponse("Feed inactive", { status: 410 });
  }

  // 2. Fetch the org slug for building public URLs
  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", connection.organization_id)
    .single();

  if (!org) {
    return new NextResponse("Organization not found", { status: 404 });
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const tenantBase = `${protocol}://${org.slug}.${rootDomain}`;

  // 3. Fetch all available properties for this org
  const { data: properties, error: propError } = await supabase
    .from("properties")
    .select(
      "id, title, description, property_type, business_type, sale_price, rent_price, currency, city, locality, address, built_area_m2, bedrooms, bathrooms, parking_spots, stratum, year_built, images, slug, updated_at, availability"
    )
    .eq("organization_id", connection.organization_id)
    .eq("availability", "disponible")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  if (propError) {
    console.error("[portal-feed] Error fetching properties:", propError.message);
    return new NextResponse("Internal error", { status: 500 });
  }

  // 4. Map DB rows to PortalPropertyData
  const feedProperties: (PortalPropertyData & { updated_at: string })[] = (properties || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => {
      const titleText =
        typeof p.title === "object" && p.title?.es ? p.title.es : String(p.title || "");
      const descText =
        typeof p.description === "object" && p.description?.es
          ? p.description.es
          : String(p.description || "");

      const price =
        p.business_type === "arriendo"
          ? Number(p.rent_price || 0)
          : Number(p.sale_price || 0);

      const images = (p.images || []).map((url: string, i: number) => ({
        url,
        position: i,
      }));

      return {
        id: p.id,
        title: titleText,
        description: descText,
        property_type: p.property_type,
        business_type: p.business_type,
        price,
        currency: p.currency || "COP",
        city: p.city || "",
        neighborhood: p.locality || undefined,
        address: p.address || undefined,
        area_m2: p.built_area_m2 ? Number(p.built_area_m2) : undefined,
        bedrooms: p.bedrooms || undefined,
        bathrooms: p.bathrooms || undefined,
        parking_spots: p.parking_spots || undefined,
        stratum: p.stratum || undefined,
        year_built: p.year_built || undefined,
        images,
        url: `${tenantBase}/properties/${p.slug}`,
        updated_at: p.updated_at,
      };
    }
  );

  // 5. Generate XML
  const xml = generateProppitXml(feedProperties);

  // 6. Update sync status
  await supabase
    .from("portal_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "success",
      properties_synced: feedProperties.length,
    })
    .eq("id", connectionId);

  // 7. Return XML with proper headers + 1h cache
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
    },
  });
}
