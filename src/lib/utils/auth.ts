import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile, UserRole } from "@/lib/supabase/types";

export async function getCurrentUser(): Promise<{
  user: UserProfile;
  authUser: { id: string; email: string };
} | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) return null;

  return {
    user: profile,
    authUser: { id: authUser.id, email: authUser.email || "" },
  };
}

export async function requireAuth(): Promise<{
  user: UserProfile;
  authUser: { id: string; email: string };
}> {
  const result = await getCurrentUser();
  if (!result) {
    redirect("/login");
  }
  return result;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<{
  user: UserProfile;
  authUser: { id: string; email: string };
}> {
  const result = await requireAuth();
  if (!allowedRoles.includes(result.user.role as UserRole)) {
    redirect("/login");
  }
  return result;
}
