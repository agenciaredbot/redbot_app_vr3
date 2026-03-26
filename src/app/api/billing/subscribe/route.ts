import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { subscribe } from "@/lib/billing/engine";
import type { PlanTier } from "@/lib/supabase/types";

/**
 * POST /api/billing/subscribe — Create subscription via Mercado Pago
 * Body: { planTier, payerEmail }
 *
 * Hosted checkout flow:
 * 1. Frontend sends planTier + payerEmail
 * 2. Engine creates pending MP subscription (no card data needed)
 * 3. Returns { initPoint } — URL to redirect user to MP checkout
 * 4. User pays on mercadopago.com
 * 5. Webhook activates the subscription
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const body = await request.json();
  const { planTier, payerEmail, billingPeriod } = body;

  if (!planTier || !["lite", "basic", "power", "omni"].includes(planTier)) {
    return NextResponse.json(
      { error: "Plan inválido. Debe ser 'lite', 'basic', 'power' o 'omni'" },
      { status: 400 }
    );
  }

  if (billingPeriod && !["monthly", "annual"].includes(billingPeriod)) {
    return NextResponse.json(
      { error: "Período inválido. Debe ser 'monthly' o 'annual'" },
      { status: 400 }
    );
  }

  // payerEmail is optional — MP hosted checkout handles email at payment time
  // This allows customers to pay with any Mercado Pago account

  try {
    const result = await subscribe({
      organizationId,
      planTier: planTier as PlanTier,
      payerEmail: payerEmail || "",
      billingPeriod: billingPeriod || "monthly",
    });

    return NextResponse.json({
      subscriptionId: result.subscriptionId,
      providerSubscriptionId: result.providerSubscriptionId,
      initPoint: result.initPoint,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al suscribirse" },
      { status: 400 }
    );
  }
}
