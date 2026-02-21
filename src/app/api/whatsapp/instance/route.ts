import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInstance,
  connectInstance,
  deleteInstance,
  logoutInstance,
  buildInstanceName,
} from "@/lib/evolution/client";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";

/**
 * POST /api/whatsapp/instance — Create a new WhatsApp instance for the org
 *
 * 1. Creates instance in Evolution API
 * 2. Saves instance info in our DB (whatsapp_instances)
 * 3. Returns instance data + QR code (if available)
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  // Check feature gate — WhatsApp requires Power plan or above
  const featureCheck = await hasFeatureForOrg(organizationId, "whatsappChannel");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.message },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();

  // Get org slug for instance naming
  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", organizationId)
    .single();

  if (!org) {
    return NextResponse.json(
      { error: "Organización no encontrada" },
      { status: 404 }
    );
  }

  // Check if instance already exists
  const { data: existing } = await supabase
    .from("whatsapp_instances")
    .select("id")
    .eq("organization_id", organizationId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una instancia de WhatsApp para esta organización" },
      { status: 409 }
    );
  }

  const instanceName = buildInstanceName(org.slug);

  try {
    // Create instance in Evolution API
    const evoResponse = await createInstance(instanceName);

    // Save to our DB
    const { data: instance, error: dbError } = await supabase
      .from("whatsapp_instances")
      .insert({
        organization_id: organizationId,
        instance_name: instanceName,
        instance_token: evoResponse.hash || null,
        connection_status: "connecting",
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete from Evolution if DB insert failed
      try {
        await deleteInstance(instanceName);
      } catch {
        console.error("[whatsapp] Failed to rollback Evolution instance");
      }
      throw new Error(dbError.message);
    }

    // Get QR code — try from createInstance response first, then fetch explicitly
    let qrBase64 = evoResponse.qrcode?.base64 || null;

    if (!qrBase64) {
      console.log("[whatsapp] No QR in createInstance response, fetching via connectInstance...");
      try {
        const qrResponse = await connectInstance(instanceName);
        qrBase64 = qrResponse.base64 || null;
      } catch (qrErr) {
        console.warn("[whatsapp] connectInstance failed (QR not available yet):", qrErr);
        // Not fatal — user can click "Generar QR" manually
      }
    }

    return NextResponse.json({
      instance,
      qrcode: qrBase64,
    });
  } catch (err) {
    console.error("[whatsapp] Error creating instance:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al crear instancia de WhatsApp" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp/instance — Get the org's WhatsApp instance info
 */
export async function GET() {
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
    return NextResponse.json({ instance: null });
  }

  return NextResponse.json({ instance });
}

/**
 * DELETE /api/whatsapp/instance — Delete the org's WhatsApp instance
 *
 * 1. Logout from WhatsApp (disconnect phone)
 * 2. Delete from Evolution API
 * 3. Delete from our DB
 */
export async function DELETE() {
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
      { error: "No hay instancia de WhatsApp para eliminar" },
      { status: 404 }
    );
  }

  try {
    // Try to logout and delete from Evolution API
    try {
      await logoutInstance(instance.instance_name);
    } catch {
      // Instance might already be disconnected
    }
    try {
      await deleteInstance(instance.instance_name);
    } catch {
      // Instance might not exist in Evolution
    }

    // Delete from our DB
    await supabase
      .from("whatsapp_instances")
      .delete()
      .eq("id", instance.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[whatsapp] Error deleting instance:", err);
    return NextResponse.json(
      { error: "Error al eliminar instancia de WhatsApp" },
      { status: 500 }
    );
  }
}
