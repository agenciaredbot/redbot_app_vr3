import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GradientBackground } from "@/components/ui/gradient-background";
import { TenantNavbar } from "@/components/layout/tenant-navbar";
import { TenantFooter } from "@/components/layout/tenant-footer";
import { ChatWindow } from "@/components/chat/chat-window";
import { getI18nText } from "@/lib/utils/format";

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
    .select("id, name, slug, logo_url, primary_color, secondary_color, agent_name, agent_welcome_message")
    .eq("slug", slug)
    .single();

  if (!org) {
    notFound();
  }

  const welcomeMessage = getI18nText(org.agent_welcome_message);

  return (
    <div className="min-h-screen flex flex-col">
      <GradientBackground />
      <TenantNavbar orgName={org.name} logoUrl={org.logo_url} />
      <main className="flex-1">{children}</main>
      <TenantFooter />
      <ChatWindow
        organizationSlug={org.slug}
        agentName={org.agent_name}
        welcomeMessage={welcomeMessage || undefined}
      />
    </div>
  );
}
