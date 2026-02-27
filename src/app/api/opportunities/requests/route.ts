import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/opportunities/requests
 * List reverse requests (property wanted ads) from all organizations.
 * Active requests are visible to everyone. Own requests show all statuses.
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all"; // all, mine
  const city = searchParams.get("city") || "";
  const propertyType = searchParams.get("property_type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  const adminSupabase = createAdminClient();

  let query = adminSupabase
    .from("opportunity_requests")
    .select(
      "*, organizations!inner(name, slug)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter === "mine") {
    query = query.eq("organization_id", organizationId);
  } else {
    // Show active from all orgs + all statuses from own org
    query = query.or(`status.eq.active,organization_id.eq.${organizationId}`);
  }

  if (city) {
    query = query.ilike("city", `%${city}%`);
  }
  if (propertyType) {
    query = query.eq("property_type", propertyType);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[opportunities/requests] GET error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  const requests = (data || []).map((r: any) => ({
    ...r,
    org_name: r.organizations?.name || "Desconocida",
    org_slug: r.organizations?.slug || "",
    is_mine: r.organization_id === organizationId,
    organizations: undefined,
  }));

  return NextResponse.json({
    requests,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

/**
 * POST /api/opportunities/requests
 * Create a reverse request ("I'm looking for X type of property").
 * Gate: Power/Omni only.
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin", "org_agent"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { userId, organizationId } = authResult;

  // Feature gate
  const featureCheck = await hasFeatureForOrg(organizationId, "opportunitiesNetwork");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message, requiredPlan: featureCheck.requiredPlan },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    title,
    property_type,
    business_type,
    city,
    zone,
    min_price,
    max_price,
    min_bedrooms,
    min_bathrooms,
    min_area_m2,
    additional_notes,
  } = body;

  if (!title || title.trim().length < 5) {
    return NextResponse.json(
      { error: "El título debe tener al menos 5 caracteres" },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("opportunity_requests")
    .insert({
      organization_id: organizationId,
      created_by: userId,
      title: title.trim(),
      property_type: property_type || null,
      business_type: business_type || null,
      city: city || null,
      zone: zone || null,
      min_price: min_price || null,
      max_price: max_price || null,
      min_bedrooms: min_bedrooms || null,
      min_bathrooms: min_bathrooms || null,
      min_area_m2: min_area_m2 || null,
      additional_notes: additional_notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[opportunities/requests] POST error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({ request: data }, { status: 201 });
}
