import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

/**
 * GET /api/team — List team members + pending invitations + limits
 */
export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  // Fetch active members
  const { data: members, error: membersError } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (membersError) {
    return NextResponse.json(
      { error: membersError.message },
      { status: 500 }
    );
  }

  // Fetch pending invitations
  const { data: pendingInvitations, error: invError } = await supabase
    .from("invitations")
    .select("id, token, role, expires_at, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (invError) {
    return NextResponse.json({ error: invError.message }, { status: 500 });
  }

  // Fetch org limits
  const { data: org } = await supabase
    .from("organizations")
    .select("max_agents")
    .eq("id", organizationId)
    .single();

  const maxAgents = org?.max_agents ?? 2;
  const currentCount = members?.length ?? 0;

  return NextResponse.json({
    members: members || [],
    pendingInvitations: pendingInvitations || [],
    limits: {
      current: currentCount,
      max: maxAgents, // -1 = unlimited
    },
  });
}

/**
 * POST /api/team — Create invitation link
 * Body: { role: "org_admin" | "org_agent" }
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, userId, organizationId } = authResult;

  const body = await request.json();
  const role = body.role;

  if (!role || !["org_admin", "org_agent"].includes(role)) {
    return NextResponse.json(
      { error: "Rol inválido. Debe ser 'org_admin' o 'org_agent'" },
      { status: 400 }
    );
  }

  // Check member limit
  const { count: activeCount } = await supabase
    .from("user_profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  const { data: org } = await supabase
    .from("organizations")
    .select("max_agents")
    .eq("id", organizationId)
    .single();

  const maxAgents = org?.max_agents ?? 2;
  const current = activeCount ?? 0;

  // -1 means unlimited
  if (maxAgents !== -1 && current >= maxAgents) {
    return NextResponse.json(
      {
        error: `Límite de miembros alcanzado (${current}/${maxAgents}). Actualiza tu plan para agregar más.`,
      },
      { status: 403 }
    );
  }

  // Also count pending invitations towards the limit
  const { count: pendingCount } = await supabase
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  const totalReserved = current + (pendingCount ?? 0);
  if (maxAgents !== -1 && totalReserved >= maxAgents) {
    return NextResponse.json(
      {
        error: `Ya hay invitaciones pendientes que alcanzarían el límite. Cancela alguna o actualiza tu plan.`,
      },
      { status: 403 }
    );
  }

  // Generate token
  const token = crypto.randomUUID();

  const { data: invitation, error: insertError } = await supabase
    .from("invitations")
    .insert({
      organization_id: organizationId,
      token,
      role,
      invited_by: userId,
    })
    .select("id, token, role, expires_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    invitation,
    inviteUrl: `${appUrl}/join/${token}`,
  });
}
