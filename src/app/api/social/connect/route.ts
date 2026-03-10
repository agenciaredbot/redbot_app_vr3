import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey } from "@/lib/social/late-client";

/**
 * POST /api/social/connect
 * Save or update the tenant's Late API key.
 * Validates the key with Late before saving.
 *
 * DELETE /api/social/connect
 * Disconnect Late (deactivate connection).
 */

export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  // Feature gate
  const featureCheck = await hasFeatureForOrg(organizationId, "socialPublishing");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { apiKey } = body as { apiKey: string };

  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk_")) {
    return NextResponse.json(
      { error: "API Key inválida. Las claves de Late empiezan con 'sk_'." },
      { status: 400 }
    );
  }

  // Validate with Late API
  const validation = await validateApiKey(apiKey.trim());
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || "No se pudo validar la API Key con Late." },
      { status: 400 }
    );
  }

  // Upsert connection (one per org + platform)
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("social_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("platform", "late")
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("social_connections")
      .update({
        api_key: apiKey.trim(),
        is_active: true,
        connected_accounts: validation.accounts,
        last_validated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[social/connect] Update failed:", error);
      return NextResponse.json(
        { error: "Error al actualizar la conexión." },
        { status: 500 }
      );
    }
  } else {
    // Insert new
    const { error } = await supabase.from("social_connections").insert({
      organization_id: organizationId,
      platform: "late",
      api_key: apiKey.trim(),
      is_active: true,
      connected_accounts: validation.accounts,
      last_validated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[social/connect] Insert failed:", error);
      return NextResponse.json(
        { error: "Error al guardar la conexión." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    accounts: validation.accounts,
    message: `Conectado exitosamente. ${validation.accounts.length} cuenta(s) encontrada(s).`,
  });
}

export async function DELETE() {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("social_connections")
    .update({ is_active: false })
    .eq("organization_id", organizationId)
    .eq("platform", "late");

  if (error) {
    console.error("[social/connect] Disconnect failed:", error);
    return NextResponse.json(
      { error: "Error al desconectar." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Desconectado exitosamente." });
}
