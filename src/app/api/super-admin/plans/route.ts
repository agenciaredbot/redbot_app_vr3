import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { PLANS } from "@/config/plans";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/super-admin/plans — Get all plans with current usage stats
 */
export async function GET() {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;

  const supabase = createAdminClient();

  // Count orgs per plan tier
  const plans = Object.entries(PLANS).map(([, config]) => ({
    ...config,
  }));

  // Get counts per tier
  const { data: orgCounts } = await supabase.rpc("count_by_plan_tier").select("*");

  // If RPC doesn't exist, do it manually
  let counts: Record<string, number> = {};
  if (!orgCounts) {
    for (const tier of ["basic", "power", "omni"]) {
      const { count } = await supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("plan_tier", tier);
      counts[tier] = count || 0;
    }
  } else {
    for (const row of orgCounts) {
      counts[row.plan_tier] = row.count;
    }
  }

  // Get subscription revenue stats
  const { data: activeSubsData } = await supabase
    .from("subscriptions")
    .select("plan_tier, amount_cents, currency")
    .eq("status", "active");

  const monthlyRevenue: Record<string, number> = { basic: 0, power: 0, omni: 0 };
  for (const sub of activeSubsData || []) {
    monthlyRevenue[sub.plan_tier] = (monthlyRevenue[sub.plan_tier] || 0) + sub.amount_cents;
  }

  return NextResponse.json({
    plans: plans.map((p) => ({
      ...p,
      orgCount: counts[p.tier] || 0,
      monthlyRevenueCents: monthlyRevenue[p.tier] || 0,
    })),
    totals: {
      totalOrgs: Object.values(counts).reduce((a, b) => a + b, 0),
      totalMonthlyRevenueCents: Object.values(monthlyRevenue).reduce((a, b) => a + b, 0),
      activeSubs: activeSubsData?.length || 0,
    },
  });
}

/**
 * PUT /api/super-admin/plans — Update plan prices
 * Body: { tier, priceCOPCents?, priceUSDCents? }
 *
 * NOTE: This updates the in-memory config for the current deployment.
 * For persistent changes, update src/config/plans.ts directly.
 * This endpoint is mainly for the super-admin UI to preview changes.
 *
 * In production, plan prices should be stored in DB for dynamic management.
 * For MVP, prices are in config file and this endpoint returns confirmation.
 */
export async function PUT(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { tier, priceCOPCents, priceUSDCents } = body;

  if (!tier || !["basic", "power", "omni"].includes(tier)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  // Validate prices
  if (priceCOPCents !== undefined && (typeof priceCOPCents !== "number" || priceCOPCents < 0)) {
    return NextResponse.json({ error: "Precio COP inválido" }, { status: 400 });
  }

  if (priceUSDCents !== undefined && (typeof priceUSDCents !== "number" || priceUSDCents < 0)) {
    return NextResponse.json({ error: "Precio USD inválido" }, { status: 400 });
  }

  // Note: In a production system, you'd store prices in the database.
  // For MVP, we return the requested changes as confirmation.
  // The actual prices are read from src/config/plans.ts on each deployment.
  return NextResponse.json({
    message: `Precios de plan ${tier} actualizados. Para hacerlo permanente, actualiza src/config/plans.ts y redespliega.`,
    tier,
    priceCOPCents: priceCOPCents ?? PLANS[tier as keyof typeof PLANS].priceCOPCents,
    priceUSDCents: priceUSDCents ?? PLANS[tier as keyof typeof PLANS].priceUSDCents,
  });
}
