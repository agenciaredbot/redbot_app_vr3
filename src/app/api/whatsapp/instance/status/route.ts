import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectionState, fetchInstanceInfo, jidToPhone } from "@/lib/evolution/client";

/**
 * GET /api/whatsapp/instance/status — Get live connection status
 *
 * Queries Evolution API for real-time connection state and
 * syncs it with our database.
 *
 * Used by the frontend for polling during QR scan flow.
 */
export async function GET() {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const supabase = createAdminClient();

  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  if (!instance) {
    return NextResponse.json({ instance: null });
  }

  try {
    // Query Evolution API for live status
    const state = await getConnectionState(instance.instance_name);

    console.log(
      `[whatsapp-status] ${instance.instance_name}: live=${state.state}, db=${instance.connection_status}`
    );

    // Map Evolution state to our status
    let dbStatus: string = instance.connection_status;
    const updates: Record<string, unknown> = {};

    if (state.state === "open" && instance.connection_status !== "connected") {
      dbStatus = "connected";
      updates.connection_status = "connected";
      updates.connected_at = new Date().toISOString();
      updates.disconnected_at = null;

      // Try to fetch the connected phone number
      try {
        const info = await fetchInstanceInfo(instance.instance_name);
        if (info.ownerJid) {
          const phone = jidToPhone(info.ownerJid);
          updates.connected_phone = phone;
          console.log(`[whatsapp-status] Connected phone: ${phone}`);
        }
      } catch (phoneErr) {
        console.warn("[whatsapp-status] Could not fetch phone number:", phoneErr);
      }
    } else if (state.state === "close" && instance.connection_status === "connected") {
      dbStatus = "disconnected";
      updates.connection_status = "disconnected";
      updates.disconnected_at = new Date().toISOString();
    } else if (state.state === "connecting") {
      dbStatus = "connecting";
      updates.connection_status = "connecting";
    }

    // Sync to DB if changed
    if (Object.keys(updates).length > 0) {
      console.log(`[whatsapp-status] Updating DB:`, updates);
      await supabase
        .from("whatsapp_instances")
        .update(updates)
        .eq("id", instance.id);
    }

    return NextResponse.json({
      instance: {
        ...instance,
        connection_status: dbStatus,
        // Include phone if we just fetched it
        ...(updates.connected_phone ? { connected_phone: updates.connected_phone } : {}),
      },
      liveState: state.state,
    });
  } catch (err) {
    // If Evolution API is unreachable, return DB state
    console.warn("[whatsapp-status] Error fetching live status:", err);
    return NextResponse.json({
      instance,
      liveState: null,
      warning: "No se pudo consultar Evolution API",
    });
  }
}
