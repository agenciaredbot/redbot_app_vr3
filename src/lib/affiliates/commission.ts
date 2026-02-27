/**
 * Affiliate Commission Engine
 *
 * Calculates and records commissions when a referred org's payment is confirmed.
 * Called from the billing engine's handleSubscriptionPayment() — non-blocking.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface CommissionContext {
  invoiceId: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Process affiliate commission for a payment.
 * Checks if the paying org was referred by an affiliate,
 * calculates commission based on plan tier rate, and records it.
 *
 * Idempotent: skips if commission already exists for this invoice.
 */
export async function processAffiliateCommission(
  orgId: string,
  planTier: string,
  paymentAmountCents: number,
  context: CommissionContext
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Check if org has a referral
  const { data: org } = await supabase
    .from("organizations")
    .select("referred_by_affiliate_id")
    .eq("id", orgId)
    .single();

  if (!org?.referred_by_affiliate_id) return;

  // 2. Get the referral record
  const { data: referral } = await supabase
    .from("affiliate_referrals")
    .select("id, status, affiliate_id")
    .eq("referred_org_id", orgId)
    .eq("affiliate_id", org.referred_by_affiliate_id)
    .not("status", "eq", "cancelled")
    .single();

  if (!referral) return;

  // 3. Verify affiliate is active
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, status")
    .eq("id", referral.affiliate_id)
    .eq("status", "active")
    .single();

  if (!affiliate) return;

  // 4. Get commission rate for this plan tier
  const { data: rate } = await supabase
    .from("affiliate_commission_rates")
    .select("commission_percent")
    .eq("plan_tier", planTier)
    .eq("is_active", true)
    .single();

  if (!rate) return;

  // 5. Calculate commission
  const commissionAmountCents = Math.round(
    paymentAmountCents * (Number(rate.commission_percent) / 100)
  );

  if (commissionAmountCents <= 0) return;

  // 6. Idempotency: check if commission already exists for this invoice
  const { data: existing } = await supabase
    .from("affiliate_commissions")
    .select("id")
    .eq("invoice_id", context.invoiceId)
    .single();

  if (existing) return;

  // 7. Create commission record
  await supabase.from("affiliate_commissions").insert({
    affiliate_id: affiliate.id,
    referral_id: referral.id,
    invoice_id: context.invoiceId,
    plan_tier: planTier,
    commission_rate_percent: Number(rate.commission_percent),
    base_amount_cents: paymentAmountCents,
    commission_amount_cents: commissionAmountCents,
    currency: "COP",
    status: "pending",
    period_start: context.periodStart,
    period_end: context.periodEnd,
  });

  // 8. Update affiliate balance
  await supabase.rpc("update_affiliate_balance", {
    aff_id: affiliate.id,
    amount: commissionAmountCents,
  });

  // 9. If this is the first payment, activate the referral
  if (referral.status === "pending") {
    await supabase
      .from("affiliate_referrals")
      .update({
        status: "active",
        converted_at: new Date().toISOString(),
        referred_plan_tier: planTier,
      })
      .eq("id", referral.id);

    await supabase.rpc("increment_affiliate_active_referrals", {
      aff_id: affiliate.id,
    });
  }

  console.log(
    `[affiliates] Commission created: $${commissionAmountCents / 100} COP for affiliate ${affiliate.id} (invoice ${context.invoiceId})`
  );
}
