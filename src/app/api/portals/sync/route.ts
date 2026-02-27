import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";

/**
 * POST /api/portals/sync — Trigger manual sync for a portal connection
 *
 * Body: { connectionId: string }
 *
 * For XML feeds: recalculates the feed (next request will have fresh data)
 * For REST APIs: triggers publish/update/remove cycle (future)
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
  const { connectionId } = body as { connectionId: string };

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId requerido" }, { status: 400 });
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

  // Mark as syncing
  await supabase
    .from("portal_connections")
    .update({
      last_sync_status: "syncing",
      last_sync_error: null,
    })
    .eq("id", connectionId);

  try {
    // Count published listings
    const { count } = await supabase
      .from("portal_listings")
      .select("id", { count: "exact", head: true })
      .eq("portal_connection_id", connectionId)
      .eq("status", "published");

    // For XML feeds, "sync" just means updating the count and timestamp
    // The actual XML is generated on-demand when the feed URL is requested
    await supabase
      .from("portal_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        properties_synced: count || 0,
        last_sync_error: null,
      })
      .eq("id", connectionId);

    return NextResponse.json({
      success: true,
      properties_synced: count || 0,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";

    await supabase
      .from("portal_connections")
      .update({
        last_sync_status: "error",
        last_sync_error: errorMsg,
      })
      .eq("id", connectionId);

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
