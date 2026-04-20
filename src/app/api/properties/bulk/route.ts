import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const adminClient = createAdminClient();

  const body = await request.json();
  const { action, ids } = body as { action: string; ids: string[] };

  // Validate action
  if (!action || !["delete", "publish", "unpublish"].includes(action)) {
    return NextResponse.json(
      { error: "Acción inválida" },
      { status: 400 }
    );
  }

  // Validate IDs
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Se requiere al menos un ID" },
      { status: 400 }
    );
  }

  if (ids.length > 100) {
    return NextResponse.json(
      { error: "Máximo 100 propiedades por operación" },
      { status: 400 }
    );
  }

  let result;

  switch (action) {
    case "delete":
      result = await adminClient
        .from("properties")
        .delete()
        .in("id", ids)
        .eq("organization_id", organizationId);
      break;

    case "publish":
      result = await adminClient
        .from("properties")
        .update({ is_published: true })
        .in("id", ids)
        .eq("organization_id", organizationId);
      break;

    case "unpublish":
      result = await adminClient
        .from("properties")
        .update({ is_published: false })
        .in("id", ids)
        .eq("organization_id", organizationId);
      break;
  }

  if (result?.error) {
    console.error("[Properties Bulk] Supabase error:", result.error.message, result.error.code);
    return NextResponse.json({ error: "Error en la operación" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    action,
    count: ids.length,
  });
}
