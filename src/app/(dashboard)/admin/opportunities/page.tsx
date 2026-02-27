import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasFeature } from "@/lib/plans/feature-gate";
import type { PlanTier } from "@/lib/supabase/types";
import { OpportunitiesClient } from "./opportunities-client";

export default async function OpportunitiesPage() {
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

  const { data: org } = await supabase
    .from("organizations")
    .select("id, plan_tier")
    .eq("id", profile.organization_id)
    .single();

  if (!org) redirect("/login");

  const planTier = (org.plan_tier || "basic") as PlanTier;
  const featureCheck = hasFeature(planTier, "opportunitiesNetwork");
  const canUseActiveFeatures = featureCheck.allowed;

  return (
    <OpportunitiesClient
      organizationId={profile.organization_id}
      canUseActiveFeatures={canUseActiveFeatures}
      planTier={planTier}
    />
  );
}
