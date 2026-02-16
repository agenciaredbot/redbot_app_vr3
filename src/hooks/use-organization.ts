"use client";

import { useUserStore } from "./use-user";
import type { PlanTier } from "@/lib/supabase/types";
import { PLANS } from "@/config/plans";

export function useOrganization() {
  const organization = useUserStore((state) => state.organization);

  const planLimits = organization
    ? PLANS[organization.plan_tier as PlanTier]?.limits
    : null;

  const isTrialing = organization?.plan_status === "trialing";
  const isActive = organization?.plan_status === "active" || isTrialing;

  return {
    organization,
    planLimits,
    isTrialing,
    isActive,
  };
}
