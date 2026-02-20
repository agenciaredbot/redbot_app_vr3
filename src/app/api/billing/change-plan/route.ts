import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { changePlan } from "@/lib/billing/engine";
import type { PlanTier } from "@/lib/supabase/types";

/**
 * POST /api/billing/change-plan — Change subscription plan
 * Body: { planTier }
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const body = await request.json();
  const { planTier } = body;

  if (!planTier || !["basic", "power", "omni"].includes(planTier)) {
    return NextResponse.json(
      { error: "Plan inválido. Debe ser 'basic', 'power' o 'omni'" },
      { status: 400 }
    );
  }

  try {
    await changePlan({
      organizationId,
      newPlanTier: planTier as PlanTier,
    });

    return NextResponse.json({ success: true, planTier });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al cambiar plan" },
      { status: 400 }
    );
  }
}
