import type { PlanTier } from "@/lib/supabase/types";
import type { BillingCurrency } from "@/lib/billing/types";

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
  };
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  basic: {
    name: "Starter",
    tier: "basic",
    priceCOPCents: 89_900_00, // $89,900 COP
    priceUSDCents: 22_00, // $22 USD
    trialDays: 15,
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
    },
  },
  power: {
    name: "Power",
    tier: "power",
    priceCOPCents: 199_000_00, // $199,000 COP
    priceUSDCents: 50_00, // $50 USD
    trialDays: 15,
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
    },
  },
  omni: {
    name: "Omni",
    tier: "omni",
    priceCOPCents: 399_000_00, // $399,000 COP
    priceUSDCents: 100_00, // $100 USD
    trialDays: 15,
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
    },
  },
};

/**
 * Get the price for a plan in the appropriate currency
 */
export function getPlanPrice(
  tier: PlanTier,
  currency: BillingCurrency
): number {
  const plan = PLANS[tier];
  return currency === "COP" ? plan.priceCOPCents : plan.priceUSDCents;
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
