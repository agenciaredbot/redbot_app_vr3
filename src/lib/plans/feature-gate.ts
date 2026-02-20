/**
 * Feature Gate — Central utility for plan-based feature enforcement
 *
 * Design principles:
 * - Single source of truth for all plan restrictions
 * - Extensible: add new features/limits by adding to FEATURE_REGISTRY
 * - Works both server-side (API routes) and client-side (via hook)
 * - Consistent error messages in Spanish
 *
 * Usage (server):
 *   import { checkLimit, hasFeature, getOrgLimits } from "@/lib/plans/feature-gate";
 *   const result = await checkLimit(supabase, orgId, "properties");
 *   if (!result.allowed) return NextResponse.json({ error: result.message }, { status: 403 });
 *
 * Usage (client):
 *   import { useFeatureGate } from "@/hooks/use-feature-gate";
 *   const { can, hasFeature } = useFeatureGate();
 *   if (!can("properties")) { ... }
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanDefinition } from "@/config/plans";
import type { PlanTier } from "@/lib/supabase/types";

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
  message: string;
}

export interface FeatureCheckResult {
  allowed: boolean;
  message: string;
  requiredPlan: PlanTier | null; // lowest plan that has this feature
}

/** Org data needed for gating (lightweight — no full org fetch) */
export interface OrgGateData {
  id: string;
  plan_tier: PlanTier;
  plan_status: string;
  max_properties: number;
  max_agents: number;
  max_conversations_per_month: number;
  conversations_used_this_month: number;
}

// ──────────────────────────────────────────────
//  Feature Registry — extend this as features grow
// ──────────────────────────────────────────────

/**
 * LIMIT-based features: counted resources (properties, agents, conversations)
 * Each entry defines how to count current usage from the DB.
 */
export type LimitType = "properties" | "agents" | "conversations";

interface LimitDefinition {
  /** Column on `organizations` table that stores the max */
  maxColumn: keyof Pick<OrgGateData, "max_properties" | "max_agents" | "max_conversations_per_month">;
  /** How to get the current count (DB query) */
  countQuery: (supabase: ReturnType<typeof createAdminClient>, orgId: string) => Promise<number>;
  /** Label for error messages */
  label: string;
  /** Upgrade suggestion */
  upgradeHint: string;
}

const LIMIT_REGISTRY: Record<LimitType, LimitDefinition> = {
  properties: {
    maxColumn: "max_properties",
    countQuery: async (supabase, orgId) => {
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      return count ?? 0;
    },
    label: "propiedades",
    upgradeHint: "Actualiza tu plan para agregar más propiedades.",
  },
  agents: {
    maxColumn: "max_agents",
    countQuery: async (supabase, orgId) => {
      const { count: activeCount } = await supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_active", true);
      const { count: pendingCount } = await supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      return (activeCount ?? 0) + (pendingCount ?? 0);
    },
    label: "miembros del equipo",
    upgradeHint: "Actualiza tu plan para agregar más miembros.",
  },
  conversations: {
    maxColumn: "max_conversations_per_month",
    countQuery: async (_supabase, _orgId) => {
      // For conversations, we use the pre-computed counter on the org
      // This is a special case — we read it from the org data instead
      return -1; // sentinel: use org.conversations_used_this_month
    },
    label: "conversaciones este mes",
    upgradeHint: "Actualiza tu plan para más conversaciones mensuales.",
  },
};

/**
 * BOOLEAN features: on/off per plan tier
 * Maps feature name → the key in PlanDefinition.limits
 */
export type FeatureFlag =
  | "customTags"
  | "exportLeads"
  | "customDomain"
  | "fullCustomization";

interface FeatureFlagDefinition {
  /** Key in PlanDefinition.limits to check */
  planKey: keyof PlanDefinition["limits"];
  /** Expected value for "enabled" (true for booleans, "full" for agentCustomization) */
  enabledValue: boolean | string;
  /** Label for error messages */
  label: string;
  /** Which plan first enables this */
  requiredPlan: PlanTier;
}

const FEATURE_REGISTRY: Record<FeatureFlag, FeatureFlagDefinition> = {
  customTags: {
    planKey: "customTags",
    enabledValue: true,
    label: "etiquetas personalizadas",
    requiredPlan: "power",
  },
  exportLeads: {
    planKey: "exportLeads",
    enabledValue: true,
    label: "exportación de leads",
    requiredPlan: "power",
  },
  customDomain: {
    planKey: "customDomain",
    enabledValue: true,
    label: "dominio personalizado",
    requiredPlan: "omni",
  },
  fullCustomization: {
    planKey: "agentCustomization",
    enabledValue: "full",
    label: "personalización completa del agente",
    requiredPlan: "power",
  },
};

// ──────────────────────────────────────────────
//  Core functions (server-side)
// ──────────────────────────────────────────────

/**
 * Fetch the minimal org data needed for gating decisions.
 * Uses admin client to bypass RLS.
 */
export async function getOrgGateData(orgId: string): Promise<OrgGateData | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      "id, plan_tier, plan_status, max_properties, max_agents, max_conversations_per_month, conversations_used_this_month"
    )
    .eq("id", orgId)
    .single();

  return data as OrgGateData | null;
}

/**
 * Check if the org has room for one more of the given resource.
 *
 * @param orgId - Organization ID
 * @param limitType - Which limit to check
 * @returns LimitCheckResult with allowed/current/max/message
 */
export async function checkLimit(
  orgId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  const supabase = createAdminClient();
  const org = await getOrgGateData(orgId);

  if (!org) {
    return {
      allowed: false,
      current: 0,
      max: 0,
      remaining: 0,
      message: "Organización no encontrada.",
    };
  }

  // Check plan is active or trialing
  if (!["active", "trialing"].includes(org.plan_status)) {
    return {
      allowed: false,
      current: 0,
      max: 0,
      remaining: 0,
      message: "Tu suscripción no está activa. Activa tu plan para continuar.",
    };
  }

  const def = LIMIT_REGISTRY[limitType];
  const max = org[def.maxColumn] as number;

  // Get current count
  let current: number;
  if (limitType === "conversations") {
    current = org.conversations_used_this_month;
  } else {
    current = await def.countQuery(supabase, orgId);
  }

  // -1 means unlimited
  if (max === -1) {
    return {
      allowed: true,
      current,
      max: -1,
      remaining: -1,
      message: "",
    };
  }

  const allowed = current < max;
  const remaining = Math.max(0, max - current);

  return {
    allowed,
    current,
    max,
    remaining,
    message: allowed
      ? ""
      : `Límite de ${def.label} alcanzado (${current}/${max}). ${def.upgradeHint}`,
  };
}

/**
 * Check if a boolean feature is enabled for the org's plan.
 */
export function hasFeature(
  planTier: PlanTier,
  feature: FeatureFlag
): FeatureCheckResult {
  const def = FEATURE_REGISTRY[feature];
  const planConfig = PLANS[planTier];

  if (!planConfig) {
    return {
      allowed: false,
      message: "Plan no encontrado.",
      requiredPlan: def.requiredPlan,
    };
  }

  const value = planConfig.limits[def.planKey];
  const allowed = value === def.enabledValue;

  return {
    allowed,
    message: allowed
      ? ""
      : `La función "${def.label}" requiere el plan ${PLANS[def.requiredPlan].name} o superior.`,
    requiredPlan: allowed ? null : def.requiredPlan,
  };
}

/**
 * Check feature using org ID (fetches plan_tier from DB).
 */
export async function hasFeatureForOrg(
  orgId: string,
  feature: FeatureFlag
): Promise<FeatureCheckResult> {
  const org = await getOrgGateData(orgId);
  if (!org) {
    return {
      allowed: false,
      message: "Organización no encontrada.",
      requiredPlan: null,
    };
  }

  // Check plan is active
  if (!["active", "trialing"].includes(org.plan_status)) {
    return {
      allowed: false,
      message: "Tu suscripción no está activa.",
      requiredPlan: null,
    };
  }

  return hasFeature(org.plan_tier as PlanTier, feature);
}

// ──────────────────────────────────────────────
//  Conversation counter (server-side)
// ──────────────────────────────────────────────

/**
 * Increment the monthly conversation counter for an org.
 * Tries RPC first (atomic), falls back to manual increment.
 */
export async function incrementConversationCount(orgId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("increment_conversations_used", {
    org_id: orgId,
  });

  if (error) {
    // Fallback: manual increment if RPC doesn't exist yet
    console.warn("[feature-gate] RPC not found, using direct increment:", error.message);
    await incrementConversationCountDirect(orgId);
  }
}

/**
 * Increment conversations_used_this_month via direct SQL (fallback).
 * Prefer incrementConversationCount() which uses RPC for atomicity.
 */
export async function incrementConversationCountDirect(orgId: string): Promise<void> {
  const supabase = createAdminClient();

  // Fetch current, then update (not atomic but works without RPC)
  const { data: org } = await supabase
    .from("organizations")
    .select("conversations_used_this_month")
    .eq("id", orgId)
    .single();

  if (org) {
    await supabase
      .from("organizations")
      .update({
        conversations_used_this_month: (org.conversations_used_this_month ?? 0) + 1,
      })
      .eq("id", orgId);
  }
}

// ──────────────────────────────────────────────
//  Client-side helpers (pure functions, no DB)
// ──────────────────────────────────────────────

/**
 * Client-side limit check using pre-fetched org data.
 * For use in React components via useFeatureGate hook.
 */
export function checkLimitClient(
  org: OrgGateData,
  limitType: LimitType,
  currentCount: number
): LimitCheckResult {
  const def = LIMIT_REGISTRY[limitType];
  const max = org[def.maxColumn] as number;

  if (max === -1) {
    return { allowed: true, current: currentCount, max: -1, remaining: -1, message: "" };
  }

  const allowed = currentCount < max;
  const remaining = Math.max(0, max - currentCount);

  return {
    allowed,
    current: currentCount,
    max,
    remaining,
    message: allowed
      ? ""
      : `Límite de ${def.label} alcanzado (${currentCount}/${max}). ${def.upgradeHint}`,
  };
}

// Re-export registries for introspection (useful for admin panels)
export { LIMIT_REGISTRY, FEATURE_REGISTRY };
export type { LimitDefinition, FeatureFlagDefinition };
