import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { PORTAL_REGISTRY, type PortalSlug } from "@/lib/portals/types";

/**
 * GET /api/portals — List portal connections for the user's org
 */
export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  // Feature gate
  const feature = await hasFeatureForOrg(organizationId, "portalSyndication");
  if (!feature.allowed) {
    return NextResponse.json({ error: feature.message, requiredPlan: feature.requiredPlan }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: connections, error } = await supabase
    .from("portal_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connections: connections || [] });
}

/**
 * POST /api/portals — Create a new portal connection
 *
 * Body: { portal_slug: string }
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({ allowedRoles: ["super_admin", "org_admin"] });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const feature = await hasFeatureForOrg(organizationId, "portalSyndication");
  if (!feature.allowed) {
    return NextResponse.json({ error: feature.message, requiredPlan: feature.requiredPlan }, { status: 403 });
  }

  const body = await request.json();
  const { portal_slug } = body as { portal_slug: string };

  // Validate portal slug
  if (!portal_slug || !(portal_slug in PORTAL_REGISTRY)) {
    return NextResponse.json(
      { error: `Portal no soportado: ${portal_slug}` },
      { status: 400 }
    );
  }

  const portalDef = PORTAL_REGISTRY[portal_slug as PortalSlug];

  const supabase = createAdminClient();

  // Check if connection already exists
  const { data: existing } = await supabase
    .from("portal_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("portal_slug", portal_slug)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: `Ya tienes una conexión con ${portalDef.name}` },
      { status: 409 }
    );
  }

  const { data: connection, error } = await supabase
    .from("portal_connections")
    .insert({
      organization_id: organizationId,
      portal_slug,
      credentials: {},
      is_active: true,
      last_sync_status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connection }, { status: 201 });
}

/**
 * PATCH /api/portals — Update a portal connection
 *
 * Body: { id: string, is_active?: boolean }
 */
export async function PATCH(request: NextRequest) {
  const authResult = await getAuthContext({ allowedRoles: ["super_admin", "org_admin"] });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const feature = await hasFeatureForOrg(organizationId, "portalSyndication");
  if (!feature.allowed) {
    return NextResponse.json({ error: feature.message }, { status: 403 });
  }

  const body = await request.json();
  const { id, is_active } = body as { id: string; is_active?: boolean };

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (is_active !== undefined) updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data: connection, error } = await supabase
    .from("portal_connections")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connection });
}

/**
 * DELETE /api/portals — Remove a portal connection
 *
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const authResult = await getAuthContext({ allowedRoles: ["super_admin", "org_admin"] });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const body = await request.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Delete associated portal_listings first
  await supabase
    .from("portal_listings")
    .delete()
    .eq("portal_connection_id", id);

  const { error } = await supabase
    .from("portal_connections")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
