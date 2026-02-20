import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getSubscriptionInfo } from "@/lib/billing/engine";
import { PLANS, formatPrice } from "@/config/plans";
import type { PlanTier } from "@/lib/supabase/types";
import type { BillingCurrency } from "@/lib/billing/types";

/**
 * GET /api/billing/status — Get current billing status
 */
export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  // Get org billing info
  const { data: org } = await supabase
    .from("organizations")
    .select("plan_tier, plan_status, trial_ends_at, payment_provider")
    .eq("id", organizationId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  // Get subscription details
  const subscription = await getSubscriptionInfo(organizationId);

  // Get plan config
  const planConfig = PLANS[org.plan_tier as PlanTier];

  // Get payment method count
  const { count: pmCount } = await supabase
    .from("payment_methods")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  return NextResponse.json({
    plan: {
      tier: org.plan_tier,
      name: planConfig?.name || org.plan_tier,
      status: org.plan_status,
      trialEndsAt: org.trial_ends_at,
    },
    subscription: subscription
      ? {
          ...subscription,
          formattedPrice: formatPrice(
            subscription.amountCents,
            subscription.currency as BillingCurrency
          ),
        }
      : null,
    hasPaymentMethod: (pmCount || 0) > 0,
    provider: org.payment_provider || "mercadopago",
  });
}
