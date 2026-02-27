import { NextResponse } from "next/server";
import { getAffiliateContext } from "@/lib/auth/get-affiliate-context";
import { affiliateProfileUpdateSchema } from "@/lib/validators/affiliate";

/**
 * PATCH /api/affiliates/profile
 * Update affiliate payout info and contact details.
 */
export async function PATCH(request: Request) {
  const ctx = await getAffiliateContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, affiliateId } = ctx;

  const body = await request.json();
  const parsed = affiliateProfileUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.payoutMethod !== undefined) updateData.payout_method = parsed.data.payoutMethod;
  if (parsed.data.payoutDetails !== undefined) updateData.payout_details = parsed.data.payoutDetails;

  const { data, error } = await supabase
    .from("affiliates")
    .update(updateData)
    .eq("id", affiliateId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({ affiliate: data });
}
