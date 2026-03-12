import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATION_COOKIE_NAME } from "@/lib/auth/impersonation";

/**
 * Shared helper for admin server components.
 * Returns the effective organizationId (respecting super_admin impersonation)
 * along with the authenticated user's profile and supabase client.
 *
 * Redirects to /login if auth fails.
 *
 * Usage:
 *   const { supabase, profile, organizationId, isImpersonating } = await getAdminContext();
 */
export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Impersonation: super_admin can act on any org
  let organizationId = profile.organization_id;
  let isImpersonating = false;

  if (profile.role === "super_admin") {
    const cookieStore = await cookies();
    const impCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
    if (impCookie?.value) {
      organizationId = impCookie.value;
      isImpersonating = true;
    }
  }

  if (!organizationId) {
    redirect("/login");
  }

  return {
    supabase,
    profile,
    organizationId,
    isImpersonating,
  };
}
