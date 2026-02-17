import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

/**
 * DELETE /api/team/invitations — Cancel a pending invitation
 * Body: { invitationId: string }
 */
export async function DELETE(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const body = await request.json();
  const { invitationId } = body as { invitationId: string };

  if (!invitationId) {
    return NextResponse.json(
      { error: "ID de invitación requerido" },
      { status: 400 }
    );
  }

  // Verify invitation belongs to this org and is pending
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, status")
    .eq("id", invitationId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .single();

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitación no encontrada" },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "expired" })
    .eq("id", invitationId)
    .eq("organization_id", organizationId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
