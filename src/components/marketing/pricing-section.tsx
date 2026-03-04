"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PLANS,
  formatPrice,
  getPlanPrice,
  getAnnualPrice,
  getAnnualMonthlyEquivalent,
  ANNUAL_MONTHS,
} from "@/config/plans";
import { BillingPeriodToggle } from "@/components/billing/billing-period-toggle";
import type { BillingPeriod } from "@/lib/billing/types";
import type { PlanTier } from "@/lib/supabase/types";

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm text-text-secondary">{text}</span>
    </li>
  );
}

const planDescriptions: Record<PlanTier, string> = {
  basic: "Para empezar a automatizar",
  power: "Para inmobiliarias en crecimiento",
  omni: "Para redes inmobiliarias",
};

const planFeatures: Record<PlanTier, string[]> = {
  basic: [
    "Hasta 50 propiedades",
    "2 miembros del equipo",
    "100 conversaciones/mes",
    "Agente IA basico",
    "Portal web con subdominio",
    "CRM con pipeline visual",
    "Enlaces compartibles",
    "Notificaciones por email",
  ],
  power: [
    "Hasta 200 propiedades",
    "5 miembros del equipo",
    "500 conversaciones/mes",
    "Agente IA personalizado",
    "Todo lo de Starter +",
    "Canal WhatsApp 24/7",
    "Red de oportunidades",
    "Tags personalizados",
    "Exportacion de leads",
    "Socios de confianza",
  ],
  omni: [
    "Propiedades ilimitadas",
    "Equipo ilimitado",
    "2,000 conversaciones/mes",
    "Herramientas premium de IA",
    "Agente IA personalizado",
    "Canal WhatsApp 24/7",
    "CRM avanzado: Instagram y Facebook",
    "Publicacion automatica en 10+ portales",
    "Red de oportunidades",
    "Socios de confianza",
    "Tags personalizados",
    "Exportacion de leads",
    "Dominio personalizado",
    "Soporte prioritario",
  ],
};

// USD equivalents for display (approximate)
const usdEquivalents: Record<PlanTier, { monthly: number; annual: number }> = {
  basic: { monthly: 22, annual: 242 },
  power: { monthly: 50, annual: 550 },
  omni: { monthly: 100, annual: 1100 },
};

const planImages: Record<PlanTier, string> = {
  basic: "/marketing/assets/redbot-starter.png",
  power: "/marketing/assets/redbot-power.png",
  omni: "/marketing/assets/redbot-omni.png",
};

interface PricingSectionProps {
  showTrialButton?: boolean;
}

export function PricingSection({ showTrialButton = false }: PricingSectionProps) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const isAnnual = period === "annual";
  const tiers: PlanTier[] = ["basic", "power", "omni"];

  return (
    <section
      id="planes"
      className="py-20 md:py-28 px-6 border-t border-border-glass"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-white/[0.05] text-text-secondary border border-border-glass">
            Planes
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
            Elige el plan para tu inmobiliaria
          </h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            Elige el plan ideal para tu inmobiliaria.
          </p>
        </div>

        {/* Toggle */}
        <div className="mb-10">
          <BillingPeriodToggle value={period} onChange={setPeriod} />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const plan = PLANS[tier];
            const isPower = tier === "power";

            // Price calculations
            const monthlyPrice = getPlanPrice(tier, "COP");
            const displayPrice = isAnnual
              ? getAnnualMonthlyEquivalent(tier, "COP")
              : monthlyPrice;
            const annualTotal = getAnnualPrice(tier, "COP");
            const fullYearPrice = monthlyPrice * ANNUAL_MONTHS;
            const usd = usdEquivalents[tier];

            return (
              <div
                key={tier}
                className={`${
                  isPower
                    ? "relative bg-bg-glass backdrop-blur-xl border-2 border-accent-blue/40 rounded-3xl p-7 flex flex-col shadow-lg shadow-accent-blue/5"
                    : "bg-bg-glass backdrop-blur-xl border border-border-glass rounded-3xl p-7 flex flex-col"
                }`}
              >
                {isPower && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-accent-blue text-white">
                      Recomendado
                    </span>
                  </div>
                )}

                <div className="flex justify-center mb-4">
                  <Image
                    src={planImages[tier]}
                    alt={`Redbot ${plan.name}`}
                    width={120}
                    height={120}
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Redbot{" "}
                    <span
                      className={`italic ${
                        tier === "basic"
                          ? "text-accent-red"
                          : tier === "power"
                            ? "text-accent-purple"
                            : "text-yellow-400"
                      }`}
                    >
                      {plan.name}
                    </span>
                  </h3>
                  <p className="text-sm text-text-muted mt-1">
                    {planDescriptions[tier]}
                  </p>
                </div>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-text-primary">
                    {formatPrice(displayPrice, "COP")}
                  </span>
                  <span className="text-text-muted text-sm"> COP/mes</span>
                  {isAnnual ? (
                    <div className="mt-1">
                      <p className="text-xs text-text-muted">
                        <span className="line-through">
                          {formatPrice(fullYearPrice, "COP")}
                        </span>{" "}
                        <span className="text-accent-green font-medium">
                          {formatPrice(annualTotal, "COP")}/ano
                        </span>
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        (~${usd.annual} USD/ano)
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted mt-1">
                      (~${usd.monthly} USD)
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-3 flex-1">
                  {planFeatures[tier].map((feature) => (
                    <CheckItem key={feature} text={feature} />
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${tier}&intent=buy`}
                  className={`mt-8 block text-center py-3 px-4 rounded-xl font-medium transition-all ${
                    isPower
                      ? "bg-gradient-to-r from-accent-red to-accent-indigo text-white hover:opacity-90 transition-opacity"
                      : "border border-border-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                  }`}
                >
                  Adquirir {plan.name}
                </Link>

                {/* Trial button — only for Starter on the /pricing page */}
                {showTrialButton && tier === "basic" && (
                  <Link
                    href="/register?plan=basic&intent=trial"
                    className="mt-3 block text-center py-2.5 px-4 rounded-xl text-sm font-medium text-accent-green border border-accent-green/30 hover:bg-accent-green/10 transition-all"
                  >
                    Inicia una prueba gratis (5 dias)
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
