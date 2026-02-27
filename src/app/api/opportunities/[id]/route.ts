import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOpportunityNotification } from "@/lib/email/send-opportunity-notification";

/**
 * PATCH /api/opportunities/[id]
 * Approve, reject, or revoke a shared property request.
 * Owner org can approve/reject. Requester org can revoke.
 * Gate: ALL plans can respond (Basic users can approve/reject incoming requests).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { userId, organizationId } = authResult;

  const { id } = await params;
  const body = await request.json();
  const { status, response_message, commission_percent } = body;

  if (!status || !["approved", "rejected", "revoked"].includes(status)) {
    return NextResponse.json(
      { error: "Status inválido. Debe ser: approved, rejected, o revoked" },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  // Fetch the share request
  const { data: share } = await adminSupabase
    .from("shared_properties")
    .select("*, properties(title)")
    .eq("id", id)
    .single();

  if (!share) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  // Authorization: owner can approve/reject, requester can revoke
  if (status === "revoked") {
    if (share.requester_org_id !== organizationId) {
      return NextResponse.json(
        { error: "Solo puedes revocar tus propias solicitudes" },
        { status: 403 }
      );
    }
  } else {
    if (share.owner_org_id !== organizationId) {
      return NextResponse.json(
        { error: "Solo el dueño de la propiedad puede aprobar o rechazar" },
        { status: 403 }
      );
    }
  }

  // Can only respond to pending requests
  if (share.status !== "pending" && status !== "revoked") {
    return NextResponse.json(
      { error: `Esta solicitud ya fue ${share.status === "approved" ? "aprobada" : "rechazada"}` },
      { status: 400 }
    );
  }

  // For revoke, allow from any active state
  if (status === "revoked" && !["pending", "approved"].includes(share.status)) {
    return NextResponse.json(
      { error: "Solo puedes revocar solicitudes pendientes o aprobadas" },
      { status: 400 }
    );
  }

  // Update the share request
  const updateData: Record<string, unknown> = {
    status,
    responded_by: userId,
    responded_at: new Date().toISOString(),
  };

  if (response_message !== undefined) {
    updateData.response_message = response_message;
  }

  if (commission_percent !== undefined && status === "approved") {
    updateData.commission_percent = commission_percent;
  }

  const { data: updated, error: updateError } = await adminSupabase
    .from("shared_properties")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[opportunities/[id]] PATCH error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create notification for the other party
  const notifyOrgId =
    status === "revoked" ? share.owner_org_id : share.requester_org_id;

  const { data: responderOrg } = await adminSupabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  const propertyTitle =
    typeof share.properties?.title === "object" && share.properties?.title !== null
      ? (share.properties.title as Record<string, string>).es || "Propiedad"
      : "Propiedad";

  const notifType =
    status === "approved"
      ? "opportunity_approved"
      : status === "rejected"
        ? "opportunity_rejected"
        : "system";

  const notifTitle =
    status === "approved"
      ? "Solicitud aprobada"
      : status === "rejected"
        ? "Solicitud rechazada"
        : "Solicitud revocada";

  const notifBody =
    status === "approved"
      ? `${responderOrg?.name || "Una inmobiliaria"} aprobó compartir "${propertyTitle}". Ya puedes mostrarla en tu portal.`
      : status === "rejected"
        ? `${responderOrg?.name || "Una inmobiliaria"} rechazó compartir "${propertyTitle}".`
        : `${responderOrg?.name || "Una inmobiliaria"} revocó la solicitud para "${propertyTitle}".`;

  await adminSupabase.from("notifications").insert({
    organization_id: notifyOrgId,
    type: notifType,
    title: notifTitle,
    body: notifBody,
    metadata: {
      shared_property_id: id,
      property_id: share.property_id,
    },
  });

  // Send email notification (fire-and-forget)
  if (status === "approved" || status === "rejected") {
    sendOpportunityNotification({
      type: status === "approved" ? "opportunity_approved" : "opportunity_rejected",
      targetOrgId: notifyOrgId,
      propertyTitle,
      sourceOrgName: responderOrg?.name || "Una inmobiliaria",
      message: response_message,
      commissionPercent: status === "approved" ? (commission_percent ?? share?.commission_percent) : undefined,
    }).catch(console.error);
  }

  return NextResponse.json({ opportunity: updated });
}

/**
 * GET /api/opportunities/[id]
 * Get a single shared property by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { id } = await params;
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("shared_properties")
    .select(
      `
      *,
      properties!inner(id, title, slug, property_type, business_type, city, zone, sale_price, rent_price, currency, bedrooms, bathrooms, built_area_m2, images),
      owner_org:organizations!shared_properties_owner_org_id_fkey(name, slug),
      requester_org:organizations!shared_properties_requester_org_id_fkey(name, slug)
      `
    )
    .eq("id", id)
    .or(`owner_org_id.eq.${organizationId},requester_org_id.eq.${organizationId}`)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ opportunity: data });
}
