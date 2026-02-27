import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { GradientBackground } from "@/components/ui/gradient-background";
import { TenantNavbar } from "@/components/layout/tenant-navbar";
import { TenantFooter } from "@/components/layout/tenant-footer";
import { EmbedHider } from "@/components/layout/embed-hider";

/**
 * Cached org fetch — shared between generateMetadata and layout component.
 * React.cache() deduplicates the query within a single request.
 */
const getOrgBySlug = cache(async (slug: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, logo_url, logo_light_url, favicon_url, theme_mode, primary_color, secondary_color"
    )
    .eq("slug", slug)
    .single();
  return data;
});

/**
 * Dynamic metadata for tenant pages:
 * - Title template uses the org name (e.g. "Propiedad X | Inmobiliaria Y")
 * - Favicon uses the tenant's custom favicon if configured, falls back to Redbot's
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) return {};

  const faviconUrl = org.favicon_url || "/redbot-favicon-96x96.png";

  return {
    title: {
      default: org.name,
      template: `%s | ${org.name}`,
    },
    icons: {
      icon: faviconUrl,
      apple: faviconUrl,
    },
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    notFound();
  }

  const themeMode = org.theme_mode || "dark";
  const displayLogo =
    themeMode === "light" && org.logo_light_url
      ? org.logo_light_url
      : org.logo_url;

  return (
    <div className="min-h-screen flex flex-col" data-theme={themeMode}>
      <Suspense fallback={null}>
        <EmbedHider />
      </Suspense>
      <GradientBackground themeMode={themeMode} />
      <div data-tenant-branding>
        <TenantNavbar orgName={org.name} logoUrl={displayLogo} />
      </div>
      <main className="flex-1">{children}</main>
      <TenantFooter />
    </div>
  );
}
