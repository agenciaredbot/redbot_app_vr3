import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/opportunities/stats
 * Get opportunity statistics for the current organization.
 */
export async function GET(_request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const adminSupabase = createAdminClient();

  // Run all counts in parallel
  const [
    { count: sentPending },
    { count: sentApproved },
    { count: receivedPending },
    { count: receivedApproved },
    { count: totalSent },
    { count: totalReceived },
    { count: activeRequests },
    { count: trustedPartners },
  ] = await Promise.all([
    adminSupabase
      .from("shared_properties")
      .select("id", { count: "exact", head: true })
      .eq("requester_org_id", organizationId)
      .eq("status", "pending"),
    adminSupabase
      .from("shared_properties")
      .select("id", { count: "exact", head: true })
      .eq("requester_org_id", organizationId)
      .eq("status", "approved"),
    adminSupabase
      .from("shared_properties")
      .select("id", { count: "exact", head: true })
      .eq("owner_org_id", organizationId)
      .eq("status", "pending"),
    adminSupabase
      .from("shared_properties")
      .select("id", { count: "exact", head: true })
      .eq("owner_org_id", organizationId)
      .eq("status", "approved"),
    adminSupabase
      .from("shared_properties")
      .select("id", { count: "exact", head: true })
      .eq("requester_org_id", organizationId),
    adminSupabase
      .from("shared_properties")
      .select("id", { count: "exact", head: true })
      .eq("owner_org_id", organizationId),
    adminSupabase
      .from("opportunity_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    adminSupabase
      .from("trusted_partners")
      .select("id", { count: "exact", head: true })
      .eq("org_id", organizationId),
  ]);

  return NextResponse.json({
    stats: {
      sent: {
        pending: sentPending || 0,
        approved: sentApproved || 0,
        total: totalSent || 0,
      },
      received: {
        pending: receivedPending || 0,
        approved: receivedApproved || 0,
        total: totalReceived || 0,
      },
      activeRequests: activeRequests || 0,
      trustedPartners: trustedPartners || 0,
    },
  });
}
