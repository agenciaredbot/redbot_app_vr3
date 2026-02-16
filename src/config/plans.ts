import type { PlanTier } from "@/lib/supabase/types";

export interface PlanDefinition {
  name: string;
  tier: PlanTier;
  priceMonthly: number; // in cents
  trialDays: number;
  limits: {
    maxProperties: number; // -1 = unlimited
    maxAgents: number; // -1 = unlimited
    maxConversationsPerMonth: number;
    customTags: boolean;
    agentCustomization: "basic" | "full";
    exportLeads: boolean;
    customDomain: boolean;
  };
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  basic: {
    name: "Basic",
    tier: "basic",
    priceMonthly: 8000, // $80 USD
    trialDays: 15,
    limits: {
      maxProperties: 50,
      maxAgents: 2,
      maxConversationsPerMonth: 100,
      customTags: false,
      agentCustomization: "basic",
      exportLeads: false,
      customDomain: false,
    },
  },
  power: {
    name: "Power",
    tier: "power",
    priceMonthly: 19900, // $199 USD
    trialDays: 15,
    limits: {
      maxProperties: 200,
      maxAgents: 5,
      maxConversationsPerMonth: 500,
      customTags: true,
      agentCustomization: "full",
      exportLeads: true,
      customDomain: false,
    },
  },
  omni: {
    name: "Omni",
    tier: "omni",
    priceMonthly: 29900, // $299 USD
    trialDays: 15,
    limits: {
      maxProperties: -1,
      maxAgents: -1,
      maxConversationsPerMonth: 2000,
      customTags: true,
      agentCustomization: "full",
      exportLeads: true,
      customDomain: true,
    },
  },
};
