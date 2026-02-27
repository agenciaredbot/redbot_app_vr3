import { NextRequest, NextResponse } from "next/server";
import { getAffiliateContext } from "@/lib/auth/get-affiliate-context";

/**
 * GET /api/affiliates/referrals
 * List referrals with pagination and optional status filter.
 */
export async function GET(request: NextRequest) {
  const ctx = await getAffiliateContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, affiliateId } = ctx;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("affiliate_referrals")
    .select(
      "*, referred_org:organizations(name, slug, plan_tier, plan_status)",
      { count: "exact" }
    )
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    referrals: data || [],
    total: count || 0,
    page,
    limit,
  });
}
