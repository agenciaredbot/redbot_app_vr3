import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/opportunities/partners
 * List trusted partners for the current organization.
 * Gate: Power/Omni only.
 */
export async function GET(_request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  // Feature gate
  const featureCheck = await hasFeatureForOrg(organizationId, "opportunitiesNetwork");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message, requiredPlan: featureCheck.requiredPlan },
      { status: 403 }
    );
  }

  const adminSupabase = createAdminClient();

  // Get partners where this org is the one who set up the relationship
  const { data: myPartners, error: err1 } = await adminSupabase
    .from("trusted_partners")
    .select("*, partner_org:organizations!trusted_partners_partner_org_id_fkey(name, slug)")
    .eq("org_id", organizationId)
    .order("created_at", { ascending: false });

  // Also get orgs that have trusted THIS org (incoming trust)
  const { data: trustedByOthers, error: err2 } = await adminSupabase
    .from("trusted_partners")
    .select("*, org:organizations!trusted_partners_org_id_fkey(name, slug)")
    .eq("partner_org_id", organizationId)
    .order("created_at", { ascending: false });

  if (err1 || err2) {
    console.error("[opportunities/partners] GET error:", err1 || err2);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({
    partners: myPartners || [],
    trusted_by: trustedByOthers || [],
  });
}

/**
 * POST /api/opportunities/partners
 * Add a trusted partner relationship.
 * Gate: Power/Omni only.
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  // Feature gate
  const featureCheck = await hasFeatureForOrg(organizationId, "opportunitiesNetwork");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message, requiredPlan: featureCheck.requiredPlan },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { partner_org_id, auto_approve, default_commission } = body;

  if (!partner_org_id) {
    return NextResponse.json({ error: "partner_org_id es requerido" }, { status: 400 });
  }

  if (partner_org_id === organizationId) {
    return NextResponse.json(
      { error: "No puedes agregarte como socio de confianza" },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  // Verify partner org exists
  const { data: partnerOrg } = await adminSupabase
    .from("organizations")
    .select("id, name")
    .eq("id", partner_org_id)
    .single();

  if (!partnerOrg) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  // Upsert: update if exists, insert if not
  const { data, error } = await adminSupabase
    .from("trusted_partners")
    .upsert(
      {
        org_id: organizationId,
        partner_org_id,
        auto_approve: auto_approve ?? false,
        default_commission: default_commission ?? null,
      },
      { onConflict: "org_id,partner_org_id" }
    )
    .select("*, partner_org:organizations!trusted_partners_partner_org_id_fkey(name, slug)")
    .single();

  if (error) {
    console.error("[opportunities/partners] POST error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({ partner: data }, { status: 201 });
}

/**
 * DELETE /api/opportunities/partners
 * Remove a trusted partner relationship.
 * Gate: Power/Omni only.
 */
export async function DELETE(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("id");

  if (!partnerId) {
    return NextResponse.json({ error: "id es requerido" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("trusted_partners")
    .delete()
    .eq("id", partnerId)
    .eq("org_id", organizationId);

  if (error) {
    console.error("[opportunities/partners] DELETE error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
