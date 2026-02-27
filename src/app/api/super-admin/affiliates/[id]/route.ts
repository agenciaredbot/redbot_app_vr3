import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

/**
 * GET /api/super-admin/affiliates/[id]
 * Get affiliate detail with referrals and commissions.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const [affiliateRes, referralsRes, commissionsRes] = await Promise.all([
    supabase.from("affiliates").select("*").eq("id", id).single(),
    supabase
      .from("affiliate_referrals")
      .select("*, referred_org:organizations(name, slug, plan_tier, plan_status)")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("affiliate_commissions")
      .select("*, referral:affiliate_referrals(referred_org:organizations(name))")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (affiliateRes.error || !affiliateRes.data) {
    return NextResponse.json({ error: "Afiliado no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    affiliate: affiliateRes.data,
    referrals: referralsRes.data || [],
    commissions: commissionsRes.data || [],
  });
}

/**
 * PATCH /api/super-admin/affiliates/[id]
 * Approve, suspend, or reject an affiliate.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, userId } = ctx;
  const { id } = await params;

  const body = await request.json();
  const { status, notes } = body;

  if (!status || !["active", "suspended", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "Estado inválido. Usa: active, suspended, rejected" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (status === "active") {
    updateData.approved_by = userId;
    updateData.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("affiliates")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ affiliate: data });
}
