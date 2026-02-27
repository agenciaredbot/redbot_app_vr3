import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AffiliateContext {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
  affiliateId: string;
  role: string;
  organizationId: string | null;
}

/**
 * Auth helper for affiliate API routes.
 * Verifies the caller is authenticated AND has an active affiliate record.
 * Works for both "affiliate" role users (external) and "org_admin" users
 * who have activated as affiliates (tenant).
 *
 * Returns admin client for cross-org queries.
 */
export async function getAffiliateContext(): Promise<
  AffiliateContext | NextResponse
> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await authClient
    .from("user_profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil de usuario no encontrado" },
      { status: 403 }
    );
  }

  const adminClient = createAdminClient();

  // Find affiliate record for this user
  const { data: affiliate } = await adminClient
    .from("affiliates")
    .select("id, status")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) {
    return NextResponse.json(
      { error: "No tienes un perfil de afiliado" },
      { status: 403 }
    );
  }

  if (affiliate.status !== "active") {
    return NextResponse.json(
      { error: `Tu cuenta de afiliado está en estado: ${affiliate.status}` },
      { status: 403 }
    );
  }

  return {
    supabase: adminClient,
    userId: user.id,
    affiliateId: affiliate.id,
    role: profile.role,
    organizationId: profile.organization_id,
  };
}
