import { NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";
import { commissionRateUpdateSchema } from "@/lib/validators/affiliate";

/**
 * GET /api/super-admin/affiliates/rates
 * Get current commission rates.
 */
export async function GET() {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("affiliate_commission_rates")
    .select("*")
    .eq("is_active", true)
    .order("plan_tier");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rates: data || [] });
}

/**
 * PUT /api/super-admin/affiliates/rates
 * Update commission rates.
 */
export async function PUT(request: Request) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, userId } = ctx;

  const body = await request.json();
  const parsed = commissionRateUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Update each rate
  for (const rate of parsed.data.rates) {
    await supabase
      .from("affiliate_commission_rates")
      .update({
        commission_percent: rate.commission_percent,
        updated_by: userId,
      })
      .eq("plan_tier", rate.plan_tier)
      .eq("is_active", true);
  }

  // Fetch updated rates
  const { data } = await supabase
    .from("affiliate_commission_rates")
    .select("*")
    .eq("is_active", true)
    .order("plan_tier");

  return NextResponse.json({ rates: data || [] });
}
