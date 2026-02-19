import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SuperAdminContext {
  // Admin client with service_role key — bypasses RLS for cross-org queries
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
  role: "super_admin";
}

/**
 * Authentication + authorization helper exclusively for super admin API routes.
 * Verifies the caller is authenticated AND has the super_admin role.
 * Returns an admin client (service_role) that can query across all organizations.
 *
 * Usage:
 *   const ctx = await getSuperAdminContext();
 *   if (ctx instanceof NextResponse) return ctx;
 *   const { supabase, userId } = ctx;
 */
export async function getSuperAdminContext(): Promise<
  SuperAdminContext | NextResponse
> {
  // 1. Verify auth via cookie-based client
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Lookup user profile and verify super_admin role
  const { data: profile } = await authClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil de usuario no encontrado" },
      { status: 403 }
    );
  }

  if (profile.role !== "super_admin") {
    return NextResponse.json(
      { error: "Acceso denegado: se requiere rol super_admin" },
      { status: 403 }
    );
  }

  // 3. Return admin client for cross-org queries
  return {
    supabase: createAdminClient(),
    userId: user.id,
    role: "super_admin",
  };
}
