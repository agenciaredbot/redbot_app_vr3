import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const { data, error } = await ctx.supabase
    .from("user_profiles")
    .select("*, organizations(name, slug, plan_tier)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};

  // SECURITY: NEVER allow setting role to super_admin from the app
  if (body.role !== undefined) {
    if (body.role === "super_admin") {
      return NextResponse.json(
        { error: "No se puede asignar el rol super_admin desde la aplicacion. Use SQL en Supabase." },
        { status: 403 }
      );
    }
    if (!["org_admin", "org_agent"].includes(body.role)) {
      return NextResponse.json(
        { error: "Rol invalido. Use org_admin o org_agent." },
        { status: 400 }
      );
    }
    update.role = body.role;
  }

  if (body.is_active !== undefined) {
    update.is_active = Boolean(body.is_active);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No hay campos para actualizar" },
      { status: 400 }
    );
  }

  update.updated_at = new Date().toISOString();

  // Don't allow modifying super_admin users
  const { data: targetUser } = await ctx.supabase
    .from("user_profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (targetUser?.role === "super_admin") {
    return NextResponse.json(
      { error: "No se puede modificar un super_admin desde la aplicacion" },
      { status: 403 }
    );
  }

  const { data, error } = await ctx.supabase
    .from("user_profiles")
    .update(update)
    .eq("id", id)
    .select("*, organizations(name, slug)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  // Don't allow deleting super_admin users
  const { data: targetUser } = await ctx.supabase
    .from("user_profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (targetUser?.role === "super_admin") {
    return NextResponse.json(
      { error: "No se puede eliminar un super_admin desde la aplicacion" },
      { status: 403 }
    );
  }

  // Prevent deleting yourself
  if (id === ctx.userId) {
    return NextResponse.json(
      { error: "No puedes eliminarte a ti mismo" },
      { status: 400 }
    );
  }

  // Delete the auth user (cascades to user_profiles)
  const { error } = await ctx.supabase.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
