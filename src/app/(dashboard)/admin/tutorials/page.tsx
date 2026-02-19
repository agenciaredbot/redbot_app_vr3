import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TutorialsPageClient } from "@/components/tutorials/tutorials-page-client";

export const metadata = {
  title: "Tutoriales",
};

export default async function TutorialsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/login");

  // Get org plan_tier to determine if premium tutorials should show
  const { data: org } = await supabase
    .from("organizations")
    .select("plan_tier")
    .eq("id", profile.organization_id)
    .single();

  const planTier = org?.plan_tier || "basic";
  const hasPremium = ["power", "omni"].includes(planTier);

  return <TutorialsPageClient hasPremium={hasPremium} />;
}
