import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { listInstagramAccounts } from "@/lib/social/late-client";
import type { SocialConnection } from "@/lib/social/types";

/**
 * GET /api/social/accounts
 * Returns the Instagram accounts connected via Late for the current org.
 * Also refreshes the cached accounts from Late's API.
 */
export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const supabase = createAdminClient();

  // Get active Late connection
  const { data: connection } = await supabase
    .from("social_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("platform", "late")
    .eq("is_active", true)
    .single();

  if (!connection) {
    return NextResponse.json({
      connected: false,
      accounts: [],
      message: "No hay conexión con Late configurada.",
    });
  }

  const conn = connection as unknown as SocialConnection;

  // Refresh accounts from Late API
  const { accounts, error } = await listInstagramAccounts(conn.api_key);

  if (error) {
    // Return cached accounts if Late API fails
    return NextResponse.json({
      connected: true,
      accounts: conn.connected_accounts || [],
      stale: true,
      error: "No se pudieron actualizar las cuentas desde Late.",
    });
  }

  // Update cached accounts in DB (fire-and-forget)
  supabase
    .from("social_connections")
    .update({
      connected_accounts: accounts,
      last_validated_at: new Date().toISOString(),
    })
    .eq("id", conn.id)
    .then(({ error: updateErr }) => {
      if (updateErr) {
        console.warn("[social/accounts] Cache update failed:", updateErr.message);
      }
    });

  return NextResponse.json({
    connected: true,
    accounts,
  });
}
