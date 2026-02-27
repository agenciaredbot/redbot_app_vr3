import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

/**
 * GET /api/super-admin/affiliates/commissions
 * List all commissions with optional status filter.
 */
export async function GET(request: NextRequest) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("affiliate_commissions")
    .select(
      "*, affiliate:affiliates(display_name, email), referral:affiliate_referrals(referred_org:organizations(name))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commissions: data || [], total: count || 0, page, limit });
}

/**
 * POST /api/super-admin/affiliates/commissions
 * Batch approve pending commissions.
 */
export async function POST(request: Request) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const { commission_ids } = await request.json();

  if (!Array.isArray(commission_ids) || commission_ids.length === 0) {
    return NextResponse.json(
      { error: "Proporciona un array de commission_ids" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("affiliate_commissions")
    .update({ status: "approved" })
    .in("id", commission_ids)
    .eq("status", "pending")
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    approved: data?.length || 0,
    message: `${data?.length || 0} comisiones aprobadas`,
  });
}
