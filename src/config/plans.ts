import type { PlanTier } from "@/lib/supabase/types";
import type { BillingCurrency, BillingPeriod } from "@/lib/billing/types";

export interface PlanDefinition {
  name: string;
  tier: PlanTier;
  /** Price in COP centavos (primary currency — Mercado Pago) */
  priceCOPCents: number;
  /** Price in USD cents (secondary — Stripe, future) */
  priceUSDCents: number;
  trialDays: number;
  /** Default affiliate commission % (actual rates stored in DB, this is fallback) */
  defaultCommissionPercent: number;
  limits: {
    maxProperties: number; // -1 = unlimited
    maxAgents: number; // -1 = unlimited
    maxConversationsPerMonth: number;
    customTags: boolean;
    agentCustomization: "basic" | "full";
    exportLeads: boolean;
    customDomain: boolean;
    whatsappChannel: boolean;
    portalSyndication: boolean;
    opportunitiesNetwork: boolean;
    socialPublishing: boolean;
    videoCreation: boolean;
  };
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  basic: {
    name: "Starter",
    tier: "basic",
    priceCOPCents: 89_900_00, // $89,900 COP
    priceUSDCents: 22_00, // $22 USD
    trialDays: 5,
    defaultCommissionPercent: 10,
    limits: {
      maxProperties: 50,
      maxAgents: 2,
      maxConversationsPerMonth: 100,
      customTags: false,
      agentCustomization: "basic",
      exportLeads: false,
      customDomain: false,
      whatsappChannel: false,
      portalSyndication: false,
      opportunitiesNetwork: false,
      socialPublishing: false,
      videoCreation: false,
    },
  },
  power: {
    name: "Power",
    tier: "power",
    priceCOPCents: 199_000_00, // $199,000 COP
    priceUSDCents: 50_00, // $50 USD
    trialDays: 0,
    defaultCommissionPercent: 15,
    limits: {
      maxProperties: 200,
      maxAgents: 5,
      maxConversationsPerMonth: 500,
      customTags: true,
      agentCustomization: "full",
      exportLeads: true,
      customDomain: false,
      whatsappChannel: true,
      portalSyndication: true,
      opportunitiesNetwork: true,
      socialPublishing: true,
      videoCreation: false,
    },
  },
  omni: {
    name: "Omni",
    tier: "omni",
    priceCOPCents: 399_000_00, // $399,000 COP
    priceUSDCents: 100_00, // $100 USD
    trialDays: 0,
    defaultCommissionPercent: 20,
    limits: {
      maxProperties: -1,
      maxAgents: -1,
      maxConversationsPerMonth: 2000,
      customTags: true,
      agentCustomization: "full",
      exportLeads: true,
      customDomain: true,
      whatsappChannel: true,
      portalSyndication: true,
      opportunitiesNetwork: true,
      socialPublishing: true,
      videoCreation: true,
    },
  },
};

// ============================================================
// Trial eligibility — only Starter (basic) gets a free trial
// ============================================================

export const TRIAL_ELIGIBLE_TIERS: PlanTier[] = ["basic"];

export function isTrialEligible(tier: PlanTier): boolean {
  return TRIAL_ELIGIBLE_TIERS.includes(tier);
}

// ============================================================
// Annual Pricing — 1 month free (pay 11, get 12)
// ============================================================

export const ANNUAL_MONTHS = 12;
export const ANNUAL_DISCOUNT_MONTHS = 1;
export const ANNUAL_PAID_MONTHS = ANNUAL_MONTHS - ANNUAL_DISCOUNT_MONTHS; // 11

/**
 * Get the monthly price for a plan in the appropriate currency
 */
export function getPlanPrice(
  tier: PlanTier,
  currency: BillingCurrency
): number {
  const plan = PLANS[tier];
  return currency === "COP" ? plan.priceCOPCents : plan.priceUSDCents;
}

/**
 * Get the total annual price (11 months)
 */
export function getAnnualPrice(
  tier: PlanTier,
  currency: BillingCurrency
): number {
  return getPlanPrice(tier, currency) * ANNUAL_PAID_MONTHS;
}

/**
 * Get the effective monthly rate when paying annually
 * (total annual / 12 months)
 */
export function getAnnualMonthlyEquivalent(
  tier: PlanTier,
  currency: BillingCurrency
): number {
  return Math.round(getAnnualPrice(tier, currency) / ANNUAL_MONTHS);
}

/**
 * Get price for a billing period (monthly or annual total)
 */
export function getPlanPriceForPeriod(
  tier: PlanTier,
  currency: BillingCurrency,
  billingPeriod: BillingPeriod = "monthly"
): number {
  if (billingPeriod === "annual") return getAnnualPrice(tier, currency);
  return getPlanPrice(tier, currency);
}

/**
 * Format price for display
 * COP: $80,000 — USD: $20.00
 */
export function formatPrice(
  amountCents: number,
  currency: BillingCurrency
): string {
  if (currency === "COP") {
    const whole = Math.round(amountCents / 100);
    return `$${whole.toLocaleString("es-CO")}`;
  }
  return `$${(amountCents / 100).toFixed(2)} USD`;
}
