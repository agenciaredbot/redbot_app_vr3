import { NextRequest, NextResponse } from "next/server";
import { getAffiliateContext } from "@/lib/auth/get-affiliate-context";

/**
 * GET /api/affiliates/payouts
 * List payout history for the authenticated affiliate.
 */
export async function GET(request: NextRequest) {
  const ctx = await getAffiliateContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, affiliateId } = ctx;

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from("affiliate_payouts")
    .select("*", { count: "exact" })
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({
    payouts: data || [],
    total: count || 0,
    page,
    limit,
  });
}
