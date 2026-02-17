import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

export const metadata = {
  title: "Configuración",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/login");

  const canEdit = ["super_admin", "org_admin"].includes(profile.role);

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, city, phone, email, logo_url, favicon_url, primary_color, secondary_color, agent_name, agent_personality, agent_welcome_message, agent_language, plan_tier, plan_status, max_properties, max_conversations_per_month, conversations_used_this_month"
    )
    .eq("id", profile.organization_id)
    .single();

  if (!org) redirect("/login");

  return <SettingsPageClient org={org} canEdit={canEdit} />;
}
