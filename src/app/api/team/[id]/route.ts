import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

/**
 * PUT /api/team/[id] — Change member role
 * Body: { role: "org_admin" | "org_agent" }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, userId, organizationId } = authResult;

  const { id: memberId } = await params;
  const body = await request.json();
  const role = body.role;

  if (!role || !["org_admin", "org_agent"].includes(role)) {
    return NextResponse.json(
      { error: "Rol inválido. Debe ser 'org_admin' o 'org_agent'" },
      { status: 400 }
    );
  }

  // Cannot change own role
  if (memberId === userId) {
    return NextResponse.json(
      { error: "No puedes cambiar tu propio rol" },
      { status: 400 }
    );
  }

  // Verify member belongs to same org
  const { data: member } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .single();

  if (!member) {
    return NextResponse.json(
      { error: "Miembro no encontrado" },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, memberId, role });
}

/**
 * DELETE /api/team/[id] — Deactivate member (soft-delete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, userId, organizationId } = authResult;

  const { id: memberId } = await params;

  // Cannot deactivate self
  if (memberId === userId) {
    return NextResponse.json(
      { error: "No puedes desactivarte a ti mismo" },
      { status: 400 }
    );
  }

  // Verify member belongs to same org
  const { data: member } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .single();

  if (!member) {
    return NextResponse.json(
      { error: "Miembro no encontrado" },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ is_active: false })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, memberId });
}
