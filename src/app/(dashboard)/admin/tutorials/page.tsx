import { getAdminContext } from "@/lib/auth/get-admin-context";
import { TutorialsPageClient } from "@/components/tutorials/tutorials-page-client";

export const metadata = {
  title: "Tutoriales",
};

export default async function TutorialsPage() {
  const { supabase, organizationId } = await getAdminContext();

  // Get org plan_tier to determine if premium tutorials should show
  const { data: org } = await supabase
    .from("organizations")
    .select("plan_tier")
    .eq("id", organizationId)
    .single();

  const planTier = org?.plan_tier || "basic";
  const hasPremium = ["power", "omni"].includes(planTier);

  return <TutorialsPageClient hasPremium={hasPremium} />;
}
