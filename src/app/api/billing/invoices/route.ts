import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getInvoices } from "@/lib/billing/engine";

/**
 * GET /api/billing/invoices — List invoices for current org
 */
export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  try {
    const invoices = await getInvoices(organizationId);
    return NextResponse.json({ invoices });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener facturas" },
      { status: 500 }
    );
  }
}
