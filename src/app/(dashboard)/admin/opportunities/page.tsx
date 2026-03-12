import { getAdminContext } from "@/lib/auth/get-admin-context";
import { hasFeature } from "@/lib/plans/feature-gate";
import type { PlanTier } from "@/lib/supabase/types";
import { OpportunitiesClient } from "./opportunities-client";

export default async function OpportunitiesPage() {
  const { supabase, organizationId } = await getAdminContext();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, plan_tier")
    .eq("id", organizationId)
    .single();

  if (!org) return null;

  const planTier = (org.plan_tier || "basic") as PlanTier;
  const featureCheck = hasFeature(planTier, "opportunitiesNetwork");
  const canUseActiveFeatures = featureCheck.allowed;

  return (
    <OpportunitiesClient
      organizationId={organizationId}
      canUseActiveFeatures={canUseActiveFeatures}
      planTier={planTier}
    />
  );
}
