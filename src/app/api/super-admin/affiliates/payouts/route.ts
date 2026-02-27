import { NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";
import { payoutCreateSchema } from "@/lib/validators/affiliate";

/**
 * POST /api/super-admin/affiliates/payouts
 * Create a payout for an affiliate (marks approved commissions as paid).
 */
export async function POST(request: Request) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, userId } = ctx;

  const body = await request.json();
  const parsed = payoutCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { affiliate_id, amount_cents, payout_method, payout_details, reference_number, notes } = parsed.data;

  // Verify affiliate exists and has enough balance
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, pending_balance_cents")
    .eq("id", affiliate_id)
    .single();

  if (!affiliate) {
    return NextResponse.json({ error: "Afiliado no encontrado" }, { status: 404 });
  }

  if (affiliate.pending_balance_cents < amount_cents) {
    return NextResponse.json(
      { error: "Saldo insuficiente para este pago" },
      { status: 400 }
    );
  }

  // Create payout record
  const { data: payout, error: payoutError } = await supabase
    .from("affiliate_payouts")
    .insert({
      affiliate_id,
      amount_cents,
      currency: "COP",
      payout_method,
      payout_details: payout_details || {},
      status: "completed",
      processed_by: userId,
      processed_at: new Date().toISOString(),
      reference_number: reference_number || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (payoutError || !payout) {
    return NextResponse.json(
      { error: "Error al crear pago" },
      { status: 500 }
    );
  }

  // Mark approved commissions as paid (up to the payout amount)
  const { data: approvedComms } = await supabase
    .from("affiliate_commissions")
    .select("id, commission_amount_cents")
    .eq("affiliate_id", affiliate_id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  let remaining = amount_cents;
  const commIdsToMark: string[] = [];

  for (const comm of approvedComms || []) {
    if (remaining <= 0) break;
    commIdsToMark.push(comm.id);
    remaining -= comm.commission_amount_cents;
  }

  if (commIdsToMark.length > 0) {
    await supabase
      .from("affiliate_commissions")
      .update({ status: "paid", payout_id: payout.id })
      .in("id", commIdsToMark);
  }

  // Deduct from affiliate balance
  await supabase.rpc("deduct_affiliate_balance", {
    aff_id: affiliate_id,
    amount: amount_cents,
  });

  return NextResponse.json({
    payout,
    commissions_marked_paid: commIdsToMark.length,
  });
}
