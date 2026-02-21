import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectInstance } from "@/lib/evolution/client";

/**
 * POST /api/whatsapp/instance/connect — Generate a new QR code
 *
 * Triggers Evolution API to generate a fresh QR code for scanning.
 * The instance must already exist (created via POST /api/whatsapp/instance).
 */
export async function POST() {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const supabase = createAdminClient();

  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  if (!instance) {
    return NextResponse.json(
      { error: "No hay instancia de WhatsApp. Crea una primero." },
      { status: 404 }
    );
  }

  if (instance.connection_status === "connected") {
    return NextResponse.json(
      { error: "WhatsApp ya está conectado" },
      { status: 409 }
    );
  }

  try {
    // Request new QR from Evolution
    const qrResponse = await connectInstance(instance.instance_name);

    // Update status to "connecting"
    await supabase
      .from("whatsapp_instances")
      .update({ connection_status: "connecting" })
      .eq("id", instance.id);

    return NextResponse.json({
      qrcode: qrResponse.base64 || null,
      code: qrResponse.code || null,
    });
  } catch (err) {
    console.error("[whatsapp] Error connecting instance:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al generar QR" },
      { status: 500 }
    );
  }
}
