import { NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

/**
 * GET /api/super-admin/affiliates/stats
 * Aggregate affiliate program stats.
 */
export async function GET() {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const [
    totalAffiliates,
    activeAffiliates,
    pendingAffiliates,
    totalReferrals,
    pendingCommissions,
    approvedCommissions,
  ] = await Promise.all([
    supabase.from("affiliates").select("id", { count: "exact", head: true }),
    supabase.from("affiliates").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("affiliates").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("affiliate_referrals").select("id", { count: "exact", head: true }),
    supabase
      .from("affiliate_commissions")
      .select("commission_amount_cents")
      .eq("status", "pending"),
    supabase
      .from("affiliate_commissions")
      .select("commission_amount_cents")
      .eq("status", "approved"),
  ]);

  const pendingTotal = (pendingCommissions.data || []).reduce(
    (sum, c) => sum + (c.commission_amount_cents || 0),
    0
  );
  const approvedTotal = (approvedCommissions.data || []).reduce(
    (sum, c) => sum + (c.commission_amount_cents || 0),
    0
  );

  return NextResponse.json({
    totalAffiliates: totalAffiliates.count || 0,
    activeAffiliates: activeAffiliates.count || 0,
    pendingApproval: pendingAffiliates.count || 0,
    totalReferrals: totalReferrals.count || 0,
    pendingCommissionsCents: pendingTotal,
    approvedCommissionsCents: approvedTotal,
  });
}
