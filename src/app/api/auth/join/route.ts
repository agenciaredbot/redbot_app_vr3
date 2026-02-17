import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { joinSchema } from "@/lib/validators/auth";

/**
 * POST /api/auth/join — Accept invitation and create user in org
 * Public endpoint (no auth required) — uses adminClient like /api/auth/register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = joinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, fullName, email, password } = parsed.data;
    const supabase = createAdminClient();

    // 1. Find invitation by token
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("id, organization_id, role, status, expires_at")
      .eq("token", token)
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404 }
      );
    }

    // 2. Validate invitation status
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Esta invitación ya fue utilizada" },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    // 3. Check org member limit
    const { count: activeCount } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", invitation.organization_id)
      .eq("is_active", true);

    const { data: org } = await supabase
      .from("organizations")
      .select("max_agents, name")
      .eq("id", invitation.organization_id)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      );
    }

    const maxAgents = org.max_agents ?? 2;
    const current = activeCount ?? 0;

    if (maxAgents !== -1 && current >= maxAgents) {
      return NextResponse.json(
        {
          error: `La organización ha alcanzado su límite de miembros (${maxAgents}). Contacta al administrador.`,
        },
        { status: 403 }
      );
    }

    // 4. Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo electrónico" },
        { status: 400 }
      );
    }

    // 5. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Error al crear usuario" },
        { status: 400 }
      );
    }

    // 6. Create user profile in the invitation's org
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authData.user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
        full_name: fullName,
        email,
      });

    if (profileError) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Error al crear perfil de usuario" },
        { status: 500 }
      );
    }

    // 7. Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({
        status: "accepted",
        accepted_by: authData.user.id,
      })
      .eq("id", invitation.id);

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, email },
      organization: {
        id: invitation.organization_id,
        name: org.name,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/join?token=xxx — Get invitation details (public)
 * Used by the join page to show org name before registration
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token requerido" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id, role, status, expires_at, organization_id")
    .eq("token", token)
    .single();

  if (error || !invitation) {
    return NextResponse.json(
      { error: "Invitación no encontrada" },
      { status: 404 }
    );
  }

  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "Esta invitación ya fue utilizada" },
      { status: 400 }
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Esta invitación ha expirado" },
      { status: 400 }
    );
  }

  // Get org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .single();

  return NextResponse.json({
    valid: true,
    role: invitation.role,
    organizationName: org?.name || "Organización",
    expiresAt: invitation.expires_at,
  });
}
