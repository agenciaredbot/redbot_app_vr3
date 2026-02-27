import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOpportunityNotification } from "@/lib/email/send-opportunity-notification";

/**
 * GET /api/opportunities
 * List shared properties for the current organization (sent + received).
 * All plans can view (Basic sees received requests).
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all"; // all, sent, received
  const status = searchParams.get("status") || ""; // pending, approved, rejected, etc.
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  const adminSupabase = createAdminClient();

  let query = adminSupabase
    .from("shared_properties")
    .select(
      `
      *,
      properties!inner(id, title, slug, property_type, business_type, city, zone, sale_price, rent_price, currency, bedrooms, bathrooms, built_area_m2, images, organization_id),
      owner_org:organizations!shared_properties_owner_org_id_fkey(name, slug),
      requester_org:organizations!shared_properties_requester_org_id_fkey(name, slug)
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by direction
  if (filter === "sent") {
    query = query.eq("requester_org_id", organizationId);
  } else if (filter === "received") {
    query = query.eq("owner_org_id", organizationId);
  } else {
    // "all" — show both sent and received
    query = query.or(`owner_org_id.eq.${organizationId},requester_org_id.eq.${organizationId}`);
  }

  // Filter by status
  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[opportunities] GET error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({
    opportunities: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

/**
 * POST /api/opportunities
 * Create a share request for a property from another organization.
 * Gate: Power/Omni only.
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin", "org_agent"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { userId, organizationId } = authResult;

  // Feature gate: only Power/Omni can create requests
  const featureCheck = await hasFeatureForOrg(organizationId, "opportunitiesNetwork");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message, requiredPlan: featureCheck.requiredPlan },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { property_id, request_message, commission_percent } = body;

  if (!property_id) {
    return NextResponse.json({ error: "property_id es requerido" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Verify the property exists, is published, and belongs to ANOTHER org
  const { data: property } = await adminSupabase
    .from("properties")
    .select("id, organization_id, title")
    .eq("id", property_id)
    .eq("is_published", true)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }

  if (property.organization_id === organizationId) {
    return NextResponse.json(
      { error: "No puedes solicitar tu propia propiedad" },
      { status: 400 }
    );
  }

  // Check for existing pending/approved share
  const { data: existing } = await adminSupabase
    .from("shared_properties")
    .select("id, status")
    .eq("property_id", property_id)
    .eq("requester_org_id", organizationId)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error:
          existing.status === "pending"
            ? "Ya tienes una solicitud pendiente para esta propiedad"
            : "Esta propiedad ya está compartida contigo",
      },
      { status: 409 }
    );
  }

  // Check if owner org has this requester as a trusted partner with auto-approve
  const { data: trustedPartner } = await adminSupabase
    .from("trusted_partners")
    .select("auto_approve, default_commission")
    .eq("org_id", property.organization_id)
    .eq("partner_org_id", organizationId)
    .maybeSingle();

  const autoApprove = trustedPartner?.auto_approve ?? false;
  const defaultCommission = trustedPartner?.default_commission ?? null;

  // Create the share request
  const { data: shareRequest, error: insertError } = await adminSupabase
    .from("shared_properties")
    .insert({
      property_id,
      owner_org_id: property.organization_id,
      requester_org_id: organizationId,
      status: autoApprove ? "approved" : "pending",
      request_message: request_message || null,
      commission_percent: commission_percent ?? defaultCommission,
      requested_by: userId,
      responded_by: autoApprove ? null : null,
      responded_at: autoApprove ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[opportunities] POST error:", insertError);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  // Create notification for the property owner org
  const { data: requesterOrg } = await adminSupabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  const propertyTitle =
    typeof property.title === "object" && property.title !== null
      ? (property.title as Record<string, string>).es || "Propiedad"
      : "Propiedad";

  await adminSupabase.from("notifications").insert({
    organization_id: property.organization_id,
    type: autoApprove ? "opportunity_approved" : "opportunity_request",
    title: autoApprove
      ? `Propiedad compartida automáticamente`
      : `Nueva solicitud de compartir propiedad`,
    body: autoApprove
      ? `${requesterOrg?.name || "Una inmobiliaria"} compartió automáticamente "${propertyTitle}" (socio de confianza).`
      : `${requesterOrg?.name || "Una inmobiliaria"} quiere compartir tu propiedad "${propertyTitle}".`,
    metadata: {
      shared_property_id: shareRequest.id,
      property_id,
      requester_org_id: organizationId,
    },
  });

  // Send email notification (fire-and-forget)
  sendOpportunityNotification({
    type: autoApprove ? "opportunity_approved" : "opportunity_request",
    targetOrgId: property.organization_id,
    propertyTitle,
    sourceOrgName: requesterOrg?.name || "Una inmobiliaria",
    message: request_message,
    commissionPercent: commission_percent,
    sharedPropertyId: shareRequest.id,
  }).catch(console.error);

  return NextResponse.json({ opportunity: shareRequest }, { status: 201 });
}
