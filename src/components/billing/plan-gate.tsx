"use client";

import { useFeatureGate } from "@/hooks/use-feature-gate";
import type { FeatureFlag, LimitType } from "@/lib/plans/feature-gate";
import { PLANS } from "@/config/plans";
import type { PlanTier } from "@/lib/supabase/types";

// ──────────────────────────────────────────────
//  PlanGate — Conditionally render based on plan
// ──────────────────────────────────────────────

interface PlanGateProps {
  /** Boolean feature to check */
  feature?: FeatureFlag;
  /** Or: limit type + current count */
  limit?: LimitType;
  currentCount?: number;
  /** Content to render when allowed */
  children: React.ReactNode;
  /** Optional: what to render when blocked (default: upgrade banner) */
  fallback?: React.ReactNode;
  /** If true, hide completely instead of showing fallback */
  hideWhenBlocked?: boolean;
}

/**
 * Wrapper component that gates children based on plan features or limits.
 *
 * Usage (feature):
 *   <PlanGate feature="customTags">
 *     <TagManager />
 *   </PlanGate>
 *
 * Usage (limit):
 *   <PlanGate limit="properties" currentCount={propertiesTotal}>
 *     <AddPropertyButton />
 *   </PlanGate>
 *
 * Usage (hidden):
 *   <PlanGate feature="customDomain" hideWhenBlocked>
 *     <DomainSettings />
 *   </PlanGate>
 */
export function PlanGate({
  feature,
  limit,
  currentCount = 0,
  children,
  fallback,
  hideWhenBlocked = false,
}: PlanGateProps) {
  const gate = useFeatureGate();

  let allowed = true;
  let message = "";
  let requiredPlan: PlanTier | null = null;

  if (feature) {
    const result = gate.getFeatureInfo(feature);
    allowed = result.allowed;
    message = result.message;
    requiredPlan = result.requiredPlan;
  } else if (limit) {
    const result = gate.getLimitInfo(limit, currentCount);
    allowed = result.allowed;
    message = result.message;
  }

  if (allowed) {
    return <>{children}</>;
  }

  if (hideWhenBlocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback: upgrade banner
  return (
    <UpgradeBanner
      message={message}
      requiredPlan={requiredPlan}
    />
  );
}

// ──────────────────────────────────────────────
//  UpgradeBanner — Default blocked-state UI
// ──────────────────────────────────────────────

interface UpgradeBannerProps {
  message: string;
  requiredPlan?: PlanTier | null;
  className?: string;
}

export function UpgradeBanner({
  message,
  requiredPlan,
  className = "",
}: UpgradeBannerProps) {
  const planName = requiredPlan ? PLANS[requiredPlan]?.name : null;

  return (
    <div
      className={`rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-amber-400 mt-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06a.75.75 0 11-1.06 1.06L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.06l1.061-1.062a.75.75 0 011.06 0zM10 7a3 3 0 100 6 3 3 0 000-6zm-6.25 3a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm12.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM5.05 16.95a.75.75 0 011.06 0l1.062-1.06a.75.75 0 10-1.06-1.062l-1.062 1.061a.75.75 0 000 1.06zm9.9 0a.75.75 0 010-1.06l-1.06-1.062a.75.75 0 10-1.062 1.06l1.061 1.062a.75.75 0 001.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-200">{message}</p>
          {planName && (
            <a
              href="/admin/billing"
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              Ver plan {planName}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path
                  fillRule="evenodd"
                  d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  LimitIndicator — Show usage progress
// ──────────────────────────────────────────────

interface LimitIndicatorProps {
  current: number;
  max: number; // -1 = unlimited
  label?: string;
  className?: string;
}

/**
 * Small indicator showing current/max usage.
 *
 * Usage:
 *   <LimitIndicator current={42} max={50} label="propiedades" />
 */
export function LimitIndicator({
  current,
  max,
  label,
  className = "",
}: LimitIndicatorProps) {
  if (max === -1) {
    return (
      <span className={`text-xs text-muted-foreground ${className}`}>
        {current} {label ? label : ""} (ilimitado)
      </span>
    );
  }

  const percentage = Math.min(100, (current / max) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            isAtLimit
              ? "text-red-400 font-medium"
              : isNearLimit
                ? "text-amber-400"
                : "text-muted-foreground"
          }
        >
          {current}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit
              ? "bg-red-500"
              : isNearLimit
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
