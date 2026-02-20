import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type TenantContext =
  | { org: { name: string; slug: string; logo_url: string | null; logo_light_url: string | null }; isSubdomain: true }
  | { org: null; isSubdomain: false };

/**
 * Reads the x-organization-slug header (set by middleware) and fetches
 * the organization branding from the database.
 * Returns org data when accessed via a tenant subdomain, or null otherwise.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const headersList = await headers();
  const slug = headersList.get("x-organization-slug");

  if (!slug) {
    return { org: null, isSubdomain: false };
  }

  const supabase = createAdminClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug, logo_url, logo_light_url")
    .eq("slug", slug)
    .single();

  if (!org) {
    return { org: null, isSubdomain: false };
  }

  return { org, isSubdomain: true };
}
