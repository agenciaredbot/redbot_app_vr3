"use client";

import { useState } from "react";
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

interface CheckoutPageClientProps {
  organizationId: string;
  organizationName: string;
  planTier: PlanTier;
}

export function CheckoutPageClient({
  organizationId,
  organizationName,
  planTier,
}: CheckoutPageClientProps) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS[planTier];
  const isAnnual = period === "annual";

  const monthlyPrice = getPlanPrice(planTier, "COP");
  const annualTotal = getAnnualPrice(planTier, "COP");
  const annualMonthly = getAnnualMonthlyEquivalent(planTier, "COP");
  const fullYearPrice = monthlyPrice * ANNUAL_MONTHS;

  const displayPrice = isAnnual ? annualMonthly : monthlyPrice;
  const totalToPay = isAnnual ? annualTotal : monthlyPrice;

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          planTier,
          billingPeriod: period,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Error al crear el pago");
        setLoading(false);
        return;
      }

      if (result.initPoint) {
        // Redirect to Mercado Pago checkout
        window.location.href = result.initPoint;
      } else {
        setError("No se pudo iniciar el proceso de pago");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Completa tu compra
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {organizationName}
        </p>
      </div>

      {/* Plan summary */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-border-glass">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-text-primary text-lg">
              Plan {plan.name}
            </h2>
            <p className="text-xs text-text-muted">
              {isAnnual ? "Pago anual único" : "Suscripción mensual"}
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20">
            <span className="text-xs font-medium text-accent-blue">
              {plan.name}
            </span>
          </div>
        </div>

        {/* Key features */}
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li className="flex items-center gap-2">
            <span className="text-accent-green">✓</span>
            {plan.limits.maxProperties === -1
              ? "Propiedades ilimitadas"
              : `Hasta ${plan.limits.maxProperties} propiedades`}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-accent-green">✓</span>
            {plan.limits.maxAgents === -1
              ? "Equipo ilimitado"
              : `${plan.limits.maxAgents} miembros del equipo`}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-accent-green">✓</span>
            {plan.limits.maxConversationsPerMonth === 0
              ? "Formulario de contacto"
              : `${plan.limits.maxConversationsPerMonth.toLocaleString("es-CO")} conversaciones IA/mes`}
          </li>
        </ul>
      </div>

      {/* Billing toggle */}
      <BillingPeriodToggle value={period} onChange={setPeriod} />

      {/* Price display */}
      <div className="text-center space-y-1">
        <div>
          <span className="text-4xl font-bold text-text-primary">
            {formatPrice(displayPrice, "COP")}
          </span>
          <span className="text-text-muted text-sm"> COP/mes</span>
        </div>
        {isAnnual && (
          <div className="space-y-1">
            <p className="text-xs text-text-muted">
              <span className="line-through">
                {formatPrice(fullYearPrice, "COP")}
              </span>{" "}
              <span className="text-accent-green font-medium">
                {formatPrice(annualTotal, "COP")}/año
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Total to pay */}
      <div className="p-3 rounded-xl bg-white/[0.05] border border-border-glass text-center">
        <p className="text-sm text-text-secondary">
          Total a pagar {isAnnual ? "hoy" : "mensualmente"}:
        </p>
        <p className="text-xl font-bold text-text-primary mt-1">
          {formatPrice(totalToPay, "COP")} COP
        </p>
        {isAnnual && (
          <p className="text-xs text-accent-green mt-1">
            Ahorras {formatPrice(monthlyPrice * 100, "COP")} — 1 mes gratis
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm text-center">
          {error}
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg"
      >
        {loading ? "Redirigiendo a Mercado Pago..." : "Pagar con Mercado Pago"}
      </button>

      {/* Security note */}
      <p className="text-xs text-text-muted text-center">
        🔒 Pago seguro procesado por Mercado Pago. No almacenamos datos de tu tarjeta.
      </p>
    </div>
  );
}
