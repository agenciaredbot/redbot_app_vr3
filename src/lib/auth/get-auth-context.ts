import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  organizationId: string;
  role: string;
}

/**
 * Shared authentication + authorization helper for API routes.
 * Returns the authenticated user's context (userId, organizationId, role)
 * or an error NextResponse if auth fails.
 *
 * Usage:
 *   const authResult = await getAuthContext();
 *   if (authResult instanceof NextResponse) return authResult;
 *   const { supabase, userId, organizationId, role } = authResult;
 */
export async function getAuthContext(
  options?: { allowedRoles?: string[] }
): Promise<AuthContext | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil de usuario no encontrado" },
      { status: 403 }
    );
  }

  if (!profile.organization_id) {
    return NextResponse.json(
      { error: "No perteneces a una organización" },
      { status: 400 }
    );
  }

  // Check allowed roles if specified
  if (options?.allowedRoles && !options.allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  return {
    supabase,
    userId: user.id,
    organizationId: profile.organization_id,
    role: profile.role,
  };
}
