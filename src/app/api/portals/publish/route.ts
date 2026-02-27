import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";

/**
 * POST /api/portals/publish — Publish/unpublish properties to a portal
 *
 * Body: {
 *   connectionId: string,
 *   propertyIds: string[],
 *   action: "publish" | "remove"
 * }
 *
 * For XML feed portals: creates portal_listings records (properties appear in feed)
 * For REST API portals: creates portal_listings + triggers API call (future)
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({ allowedRoles: ["super_admin", "org_admin"] });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const feature = await hasFeatureForOrg(organizationId, "portalSyndication");
  if (!feature.allowed) {
    return NextResponse.json({ error: feature.message }, { status: 403 });
  }

  const body = await request.json();
  const { connectionId, propertyIds, action } = body as {
    connectionId: string;
    propertyIds: string[];
    action: "publish" | "remove";
  };

  if (!connectionId || !propertyIds?.length || !action) {
    return NextResponse.json(
      { error: "connectionId, propertyIds y action son requeridos" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify the connection belongs to this org
  const { data: connection } = await supabase
    .from("portal_connections")
    .select("id, portal_slug, is_active")
    .eq("id", connectionId)
    .eq("organization_id", organizationId)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Conexión no encontrada" }, { status: 404 });
  }

  if (!connection.is_active) {
    return NextResponse.json({ error: "La conexión está desactivada" }, { status: 400 });
  }

  // Verify all properties belong to this org
  const { data: validProperties } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", propertyIds);

  const validIds = new Set((validProperties || []).map((p: { id: string }) => p.id));
  const invalidIds = propertyIds.filter((id) => !validIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Propiedades no encontradas: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  if (action === "publish") {
    // Upsert portal_listings as "pending" (for XML feeds they're instantly "published")
    const listings = propertyIds.map((propertyId) => ({
      property_id: propertyId,
      portal_connection_id: connectionId,
      status: "published" as const, // XML feeds are instant
      published_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("portal_listings")
      .upsert(listings, {
        onConflict: "property_id,portal_connection_id",
      });

    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    // Update sync count
    const { count } = await supabase
      .from("portal_listings")
      .select("id", { count: "exact", head: true })
      .eq("portal_connection_id", connectionId)
      .eq("status", "published");

    await supabase
      .from("portal_connections")
      .update({ properties_synced: count || 0 })
      .eq("id", connectionId);

    return NextResponse.json({
      published: propertyIds.length,
      total_synced: count || 0,
    });
  }

  if (action === "remove") {
    const { error } = await supabase
      .from("portal_listings")
      .update({ status: "removed" })
      .eq("portal_connection_id", connectionId)
      .in("property_id", propertyIds);

    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    // Update sync count
    const { count } = await supabase
      .from("portal_listings")
      .select("id", { count: "exact", head: true })
      .eq("portal_connection_id", connectionId)
      .eq("status", "published");

    await supabase
      .from("portal_connections")
      .update({ properties_synced: count || 0 })
      .eq("id", connectionId);

    return NextResponse.json({
      removed: propertyIds.length,
      total_synced: count || 0,
    });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
