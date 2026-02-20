"use client";

import { PLANS, formatPrice } from "@/config/plans";
import { GlassButton } from "@/components/ui/glass-button";
import type { PlanTier } from "@/lib/supabase/types";
import type { BillingCurrency } from "@/lib/billing/types";

interface PlanSelectorProps {
  currentTier: PlanTier;
  currency: BillingCurrency;
  onSelect: (tier: PlanTier) => void;
  loading?: boolean;
  disabled?: boolean;
}

const features: Record<PlanTier, string[]> = {
  basic: [
    "Hasta 50 propiedades",
    "2 agentes",
    "100 conversaciones/mes",
    "Personalización básica",
  ],
  power: [
    "Hasta 200 propiedades",
    "5 agentes",
    "500 conversaciones/mes",
    "Tags personalizados",
    "Personalización completa",
    "Exportar leads",
  ],
  omni: [
    "Propiedades ilimitadas",
    "Agentes ilimitados",
    "2,000 conversaciones/mes",
    "Tags personalizados",
    "Personalización completa",
    "Exportar leads",
    "Dominio personalizado",
  ],
};

export function PlanSelector({
  currentTier,
  currency,
  onSelect,
  loading,
  disabled,
}: PlanSelectorProps) {
  const tiers: PlanTier[] = ["basic", "power", "omni"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {tiers.map((tier) => {
        const plan = PLANS[tier];
        const isCurrent = tier === currentTier;
        const price =
          currency === "COP" ? plan.priceCOPCents : plan.priceUSDCents;

        return (
          <div
            key={tier}
            className={`relative rounded-2xl border p-5 transition-all duration-200 ${
              isCurrent
                ? "border-accent-blue/40 bg-accent-blue/5"
                : "border-border-glass bg-bg-glass hover:border-border-glass-hover"
            }`}
          >
            {tier === "power" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-accent-blue to-accent-purple text-white text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {plan.name}
                </h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-text-primary">
                    {formatPrice(price, currency)}
                  </span>
                  <span className="text-sm text-text-muted"> /mes</span>
                </div>
              </div>

              <ul className="space-y-2">
                {features[tier].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <svg
                      className="w-4 h-4 text-accent-green mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <GlassButton
                variant={isCurrent ? "secondary" : "primary"}
                size="sm"
                className="w-full"
                disabled={isCurrent || loading || disabled}
                onClick={() => onSelect(tier)}
              >
                {isCurrent ? "Plan actual" : "Seleccionar"}
              </GlassButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
