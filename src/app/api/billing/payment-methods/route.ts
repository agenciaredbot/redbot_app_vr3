import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/billing/provider";
import type { PaymentProviderName } from "@/lib/billing/types";

/**
 * GET /api/billing/payment-methods — List payment methods
 */
export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { data: methods, error } = await supabase
    .from("payment_methods")
    .select("id, provider, type, last_four, brand, is_default, status, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ paymentMethods: methods || [] });
}

/**
 * POST /api/billing/payment-methods — Add payment method (display info only)
 * Body: { lastFour, brand, customerEmail, provider? }
 *
 * For Mercado Pago, cards are managed internally via subscriptions.
 * This endpoint just stores display info (last 4 digits, brand).
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const body = await request.json();
  const {
    lastFour,
    brand,
    customerEmail,
    provider: providerName = "mercadopago",
  } = body;

  if (!lastFour || !brand) {
    return NextResponse.json(
      { error: "Datos de tarjeta requeridos (lastFour, brand)" },
      { status: 400 }
    );
  }

  if (!customerEmail) {
    return NextResponse.json(
      { error: "Email de cliente requerido" },
      { status: 400 }
    );
  }

  const paymentProvider = getPaymentProvider(providerName as PaymentProviderName);

  try {
    const result = await paymentProvider.createPaymentSource({
      organizationId,
      lastFour,
      brand,
      type: "card",
      customerEmail,
    });

    const adminSupabase = createAdminClient();

    // If this is the first method, make it default
    const { count: existingCount } = await adminSupabase
      .from("payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active");

    const isFirst = (existingCount || 0) === 0;

    // If making this default, unset other defaults
    if (isFirst) {
      await adminSupabase
        .from("payment_methods")
        .update({ is_default: false })
        .eq("organization_id", organizationId)
        .eq("is_default", true);
    }

    const { data: pm, error: insertError } = await adminSupabase
      .from("payment_methods")
      .insert({
        organization_id: organizationId,
        provider: providerName,
        provider_payment_source_id: result.providerPaymentSourceId,
        type: result.type,
        last_four: result.lastFour,
        brand: result.brand,
        is_default: isFirst,
        status: result.status,
      })
      .select("id, type, last_four, brand, is_default, status")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ paymentMethod: pm });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al agregar método de pago" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/billing/payment-methods — Remove payment method
 * Body: { paymentMethodId }
 */
export async function DELETE(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const body = await request.json();
  const { paymentMethodId } = body;

  if (!paymentMethodId) {
    return NextResponse.json(
      { error: "ID del método de pago requerido" },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  // Soft-delete (mark inactive)
  const { error } = await adminSupabase
    .from("payment_methods")
    .update({ status: "inactive", is_default: false })
    .eq("id", paymentMethodId)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
