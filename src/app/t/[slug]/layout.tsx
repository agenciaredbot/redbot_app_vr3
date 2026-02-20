import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GradientBackground } from "@/components/ui/gradient-background";
import { TenantNavbar } from "@/components/layout/tenant-navbar";
import { TenantFooter } from "@/components/layout/tenant-footer";
import { EmbedHider } from "@/components/layout/embed-hider";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, logo_light_url, theme_mode, primary_color, secondary_color")
    .eq("slug", slug)
    .single();

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
