import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { cancelSubscription, reactivateSubscription } from "@/lib/billing/engine";

/**
 * POST /api/billing/cancel — Cancel subscription at end of period
 */
export async function POST() {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  try {
    await cancelSubscription(organizationId);
    return NextResponse.json({ success: true, message: "Suscripción se cancelará al final del período" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al cancelar" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/billing/cancel — Reactivate (undo cancellation)
 */
export async function DELETE() {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  try {
    await reactivateSubscription(organizationId);
    return NextResponse.json({ success: true, message: "Cancelación revertida" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al reactivar" },
      { status: 400 }
    );
  }
}
