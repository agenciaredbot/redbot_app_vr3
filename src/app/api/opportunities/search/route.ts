import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/opportunities/search
 * Cross-tenant property search — finds published properties from OTHER organizations.
 * Gate: Power/Omni only (opportunitiesNetwork feature flag).
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  // Feature gate: only Power/Omni can actively search
  const featureCheck = await hasFeatureForOrg(organizationId, "opportunitiesNetwork");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message, requiredPlan: featureCheck.requiredPlan },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const propertyType = searchParams.get("property_type") || "";
  const businessType = searchParams.get("business_type") || "";
  const city = searchParams.get("city") || "";
  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");
  const bedrooms = searchParams.get("bedrooms");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  // Use admin client to bypass RLS and query across all orgs
  const adminSupabase = createAdminClient();

  let query = adminSupabase
    .from("properties")
    .select(
      "id, title, slug, property_type, business_type, city, zone, state_department, sale_price, rent_price, currency, bedrooms, bathrooms, built_area_m2, images, is_featured, organization_id, organizations!inner(name, slug)",
      { count: "exact" }
    )
    .neq("organization_id", organizationId) // exclude own properties
    .eq("is_published", true)
    .eq("availability", "disponible")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.textSearch("fts", search, { type: "websearch", config: "spanish" });
  }
  if (propertyType) {
    query = query.eq("property_type", propertyType);
  }
  if (businessType) {
    query = query.eq("business_type", businessType);
  }
  if (city) {
    query = query.ilike("city", `%${city}%`);
  }
  if (minPrice) {
    query = query.gte("sale_price", parseInt(minPrice));
  }
  if (maxPrice) {
    query = query.lte("sale_price", parseInt(maxPrice));
  }
  if (bedrooms) {
    query = query.gte("bedrooms", parseInt(bedrooms));
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[opportunities/search] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  // Check which properties already have pending/approved share requests from this org
  const propertyIds = (data || []).map((p: any) => p.id);
  let existingShares: Record<string, string> = {};

  if (propertyIds.length > 0) {
    const { data: shares } = await adminSupabase
      .from("shared_properties")
      .select("property_id, status")
      .eq("requester_org_id", organizationId)
      .in("property_id", propertyIds)
      .in("status", ["pending", "approved"]);

    if (shares) {
      existingShares = Object.fromEntries(shares.map((s: any) => [s.property_id, s.status]));
    }
  }

  // Transform response to include org info and share status
  const properties = (data || []).map((p: any) => ({
    ...p,
    org_name: p.organizations?.name || "Desconocida",
    org_slug: p.organizations?.slug || "",
    share_status: existingShares[p.id] || null,
    organizations: undefined, // remove raw join data
  }));

  return NextResponse.json({
    properties,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
