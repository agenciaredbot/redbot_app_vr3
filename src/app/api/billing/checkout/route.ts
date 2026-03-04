import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscribe } from "@/lib/billing/engine";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import type { PlanTier } from "@/lib/supabase/types";

/**
 * POST /api/billing/checkout — Create payment for a new registration (PUBLIC)
 *
 * This endpoint is used by the checkout page after registration.
 * No auth required because the user hasn't verified their email yet.
 *
 * Body: { organizationId, planTier, billingPeriod }
 *
 * Security:
 * - Validates org exists and plan_status is "unpaid"
 * - Rate limited per IP
 * - org_id is a UUID (not guessable)
 */
export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip, RATE_LIMITS.authRegister);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo más tarde." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { organizationId, planTier, billingPeriod } = body;

  // Validate inputs
  if (!organizationId || typeof organizationId !== "string") {
    return NextResponse.json(
      { error: "ID de organización requerido" },
      { status: 400 }
    );
  }

  if (!planTier || !["basic", "power", "omni"].includes(planTier)) {
    return NextResponse.json(
      { error: "Plan inválido" },
      { status: 400 }
    );
  }

  if (billingPeriod && !["monthly", "annual"].includes(billingPeriod)) {
    return NextResponse.json(
      { error: "Período de facturación inválido" },
      { status: 400 }
    );
  }

  // Validate org exists and is unpaid (new registration, hasn't paid yet)
  const supabase = createAdminClient();
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, email, plan_status, plan_tier")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: "Organización no encontrada" },
      { status: 404 }
    );
  }

  if (org.plan_status !== "unpaid") {
    return NextResponse.json(
      { error: "Esta organización ya tiene una suscripción activa" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://redbot.app";
  const resolvedPeriod = billingPeriod || "monthly";
  const checkoutReturnBase = `${appUrl}/checkout?plan=${planTier}&org=${organizationId}`;

  try {
    const result = await subscribe({
      organizationId,
      planTier: planTier as PlanTier,
      payerEmail: org.email,
      billingPeriod: resolvedPeriod,
      backUrl: `${checkoutReturnBase}&payment=success`,
      backUrls: {
        success: `${checkoutReturnBase}&payment=success`,
        failure: `${checkoutReturnBase}&payment=failure`,
        pending: `${checkoutReturnBase}&payment=pending`,
      },
    });

    return NextResponse.json({
      initPoint: result.initPoint,
      subscriptionId: result.subscriptionId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al crear el pago" },
      { status: 400 }
    );
  }
}
