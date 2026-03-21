import { getAdminContext } from "@/lib/auth/get-admin-context";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

export const metadata = {
  title: "Configuración",
};

export default async function SettingsPage() {
  const { supabase, profile, organizationId } = await getAdminContext();

  const canEdit = ["super_admin", "org_admin"].includes(profile.role);

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, city, phone, email, logo_url, favicon_url, logo_light_url, theme_mode, primary_color, secondary_color, agent_name, agent_personality, agent_welcome_message, agent_language, portal_headline, portal_subtitle, plan_tier, plan_status, max_properties, max_conversations_per_month, conversations_used_this_month"
    )
    .eq("id", organizationId)
    .single();

  if (!org) return null;

  return <SettingsPageClient org={org} canEdit={canEdit} userName={profile.full_name} />;
}
