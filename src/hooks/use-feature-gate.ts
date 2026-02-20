"use client";

import { useUserStore } from "./use-user";
import type { PlanTier } from "@/lib/supabase/types";
import { PLANS } from "@/config/plans";
import {
  hasFeature,
  checkLimitClient,
  FEATURE_REGISTRY,
  LIMIT_REGISTRY,
  type FeatureFlag,
  type LimitType,
  type LimitCheckResult,
  type FeatureCheckResult,
  type OrgGateData,
} from "@/lib/plans/feature-gate";

/**
 * React hook for client-side feature gating.
 *
 * Uses the org data from the global user store — no extra API calls.
 *
 * Usage:
 *   const { canFeature, getLimitInfo, isActive, planTier } = useFeatureGate();
 *
 *   if (!canFeature("customTags")) {
 *     // Show upgrade prompt
 *   }
 *
 *   const propLimit = getLimitInfo("properties", propertiesCount);
 *   if (!propLimit.allowed) {
 *     // Show limit reached UI
 *   }
 */
export function useFeatureGate() {
  const organization = useUserStore((state) => state.organization);

  const planTier = (organization?.plan_tier as PlanTier) || "basic";
  const planConfig = PLANS[planTier];
  const isTrialing = organization?.plan_status === "trialing";
  const isActive =
    organization?.plan_status === "active" || isTrialing;

  /**
   * Check if a boolean feature is enabled for the current plan.
   */
  function canFeature(feature: FeatureFlag): boolean {
    if (!isActive) return false;
    return hasFeature(planTier, feature).allowed;
  }

  /**
   * Get full feature check result (includes message & required plan).
   */
  function getFeatureInfo(feature: FeatureFlag): FeatureCheckResult {
    if (!isActive) {
      return {
        allowed: false,
        message: "Tu suscripción no está activa.",
        requiredPlan: null,
      };
    }
    return hasFeature(planTier, feature);
  }

  /**
   * Check a counted limit using a pre-fetched count.
   * The count must be provided by the component (e.g., from an API response).
   */
  function getLimitInfo(
    limitType: LimitType,
    currentCount: number
  ): LimitCheckResult {
    if (!organization || !isActive) {
      return {
        allowed: false,
        current: currentCount,
        max: 0,
        remaining: 0,
        message: "Tu suscripción no está activa.",
      };
    }

    const orgGateData: OrgGateData = {
      id: organization.id,
      plan_tier: planTier,
      plan_status: organization.plan_status || "inactive",
      max_properties: organization.max_properties ?? 50,
      max_agents: organization.max_agents ?? 2,
      max_conversations_per_month:
        organization.max_conversations_per_month ?? 100,
      conversations_used_this_month:
        organization.conversations_used_this_month ?? 0,
    };

    return checkLimitClient(orgGateData, limitType, currentCount);
  }

  /**
   * Quick check: can the user create one more of this resource?
   * Uses current count from org data for conversations,
   * requires explicit count for properties/agents.
   */
  function canCreate(limitType: LimitType, currentCount: number): boolean {
    return getLimitInfo(limitType, currentCount).allowed;
  }

  return {
    // Plan info
    planTier,
    planConfig,
    isActive,
    isTrialing,

    // Feature checks
    canFeature,
    getFeatureInfo,

    // Limit checks
    getLimitInfo,
    canCreate,

    // Registries (for building dynamic UI)
    featureRegistry: FEATURE_REGISTRY,
    limitRegistry: LIMIT_REGISTRY,
  };
}
