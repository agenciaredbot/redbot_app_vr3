import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { subscribe } from "@/lib/billing/engine";
import type { PlanTier } from "@/lib/supabase/types";

/**
 * POST /api/billing/subscribe — Create subscription via Mercado Pago
 * Body: { planTier, cardTokenId, payerEmail, cardLastFour?, cardBrand? }
 *
 * Flow:
 * 1. Frontend tokenizes card with @mercadopago/sdk-js
 * 2. Sends cardTokenId + payerEmail to this endpoint
 * 3. Engine creates MP subscription + local records
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const body = await request.json();
  const { planTier, cardTokenId, payerEmail, cardLastFour, cardBrand } = body;

  if (!planTier || !["basic", "power", "omni"].includes(planTier)) {
    return NextResponse.json(
      { error: "Plan inválido. Debe ser 'basic', 'power' o 'omni'" },
      { status: 400 }
    );
  }

  if (!cardTokenId) {
    return NextResponse.json(
      { error: "Token de tarjeta requerido" },
      { status: 400 }
    );
  }

  if (!payerEmail) {
    return NextResponse.json(
      { error: "Email del pagador requerido" },
      { status: 400 }
    );
  }

  try {
    const result = await subscribe({
      organizationId,
      planTier: planTier as PlanTier,
      cardTokenId,
      payerEmail,
      cardLastFour,
      cardBrand,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al suscribirse" },
      { status: 400 }
    );
  }
}
