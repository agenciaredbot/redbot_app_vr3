import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATION_COOKIE_NAME } from "@/lib/auth/impersonation";

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  organizationId: string;
  role: string;
  isImpersonating: boolean;
  realOrganizationId: string | null;
}

/**
 * Shared authentication + authorization helper for API routes.
 * Returns the authenticated user's context (userId, organizationId, role)
 * or an error NextResponse if auth fails.
 *
 * For super_admin users with an impersonation cookie, organizationId
 * is overridden to the impersonated org. All downstream API routes
 * automatically scope to the correct org.
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

  // Check allowed roles if specified
  if (options?.allowedRoles && !options.allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // --- Impersonation: super_admin can act on behalf of any org ---
  let effectiveOrgId = profile.organization_id;
  let isImpersonating = false;

  if (profile.role === "super_admin") {
    const cookieStore = await cookies();
    const impCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);

    if (impCookie?.value) {
      // Validate the impersonated org exists
      const { data: targetOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", impCookie.value)
        .single();

      if (targetOrg) {
        effectiveOrgId = targetOrg.id;
        isImpersonating = true;
      }
      // If org doesn't exist, silently fall back to own org
    }
  }

  // Non-super_admin without org → error
  if (!effectiveOrgId) {
    return NextResponse.json(
      { error: "No perteneces a una organización" },
      { status: 400 }
    );
  }

  return {
    supabase,
    userId: user.id,
    organizationId: effectiveOrgId,
    role: profile.role,
    isImpersonating,
    realOrganizationId: profile.organization_id,
  };
}
