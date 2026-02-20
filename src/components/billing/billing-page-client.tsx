"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { SubscriptionStatusBadge } from "./subscription-status";
import { PlanSelector } from "./plan-selector";
import { InvoiceList } from "./invoice-list";
import { PLANS } from "@/config/plans";
import type { PlanTier } from "@/lib/supabase/types";
import type { BillingCurrency } from "@/lib/billing/types";

interface BillingStatus {
  plan: {
    tier: PlanTier;
    name: string;
    status: string;
    trialEndsAt: string | null;
  };
  subscription: {
    id: string;
    planTier: PlanTier;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    amountCents: number;
    currency: BillingCurrency;
    formattedPrice: string;
    trialEndsAt: string | null;
  } | null;
  hasPaymentMethod: boolean;
  provider: string;
}

interface Invoice {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  createdAt: string;
}

export function BillingPageClient() {
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Shown when user returns from MP checkout — waiting for webhook
  const [paymentPending, setPaymentPending] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, invRes] = await Promise.all([
        fetch("/api/billing/status"),
        fetch("/api/billing/invoices"),
      ]);

      const [statusData, invData] = await Promise.all([
        statusRes.json(),
        invRes.json(),
      ]);

      if (statusRes.ok) setBillingStatus(statusData);
      if (invRes.ok) setInvoices(invData.invoices || []);

      return statusData;
    } catch {
      setError("Error al cargar información de facturación");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle return from Mercado Pago checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preapprovalId = params.get("preapproval_id");

    if (preapprovalId) {
      // Clean URL params
      window.history.replaceState({}, "", window.location.pathname);
      setPaymentPending(true);

      // Poll billing status until subscription activates
      const poll = async () => {
        const data = await fetchAll();
        if (
          data?.subscription?.status &&
          data.subscription.status !== "pending"
        ) {
          // Subscription activated!
          setPaymentPending(false);
          setSuccess("¡Suscripción activada! Tu plan está listo.");
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      };

      // Initial check + poll every 3 seconds
      poll();
      pollingRef.current = setInterval(poll, 3000);

      // Stop polling after 60 seconds max
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPaymentPending(false);
          setSuccess(
            "Tu pago está siendo procesado. La suscripción se activará en unos momentos."
          );
        }
      }, 60000);
    } else {
      fetchAll();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchAll]);

  /**
   * Subscribe flow (hosted checkout):
   * 1. User selects plan
   * 2. If already subscribed → change plan via API
   * 3. If not subscribed → redirect to Mercado Pago checkout
   */
  const handleSubscribe = async (tier: PlanTier) => {
    const isChangePlan =
      billingStatus?.subscription?.status === "active" ||
      billingStatus?.subscription?.status === "trialing";

    if (isChangePlan) {
      // Change plan — no payment needed, just API call
      setActionLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/billing/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planTier: tier }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setSuccess(`Plan cambiado a ${PLANS[tier].name}`);
        setShowPlans(false);
        await fetchAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cambiar plan");
      } finally {
        setActionLoading(false);
      }
    } else {
      // New subscription — redirect to Mercado Pago
      setActionLoading(true);
      setError(null);

      try {
        // Get user email from billing status or org
        const userEmail =
          billingStatus?.plan?.tier
            ? (await fetch("/api/billing/status").then((r) => r.json()))
                ?.userEmail
            : undefined;

        const res = await fetch("/api/billing/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planTier: tier,
            payerEmail: userEmail || "billing@redbot.app",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.initPoint) {
          // Redirect to Mercado Pago hosted checkout
          window.location.href = data.initPoint;
          return; // Page will navigate away
        }

        // Fallback if no initPoint (shouldn't happen)
        await fetchAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al suscribirse");
        setActionLoading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "¿Estás seguro de que deseas cancelar tu suscripción? Se mantendrá activa hasta el final del período actual."
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(
        "Suscripción programada para cancelar al final del período"
      );
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/cancel", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(
        "Cancelación revertida. Tu suscripción continuará activa."
      );
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reactivar");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Suscripción</h1>
          <p className="text-text-secondary mt-1">Gestiona tu plan y pagos</p>
        </div>
        <GlassCard padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/[0.05] rounded w-1/3" />
            <div className="h-8 bg-white/[0.05] rounded w-1/2" />
            <div className="h-4 bg-white/[0.05] rounded w-2/3" />
          </div>
        </GlassCard>
      </div>
    );
  }

  const plan = billingStatus?.plan;
  const sub = billingStatus?.subscription;
  const currency: BillingCurrency = (sub?.currency as BillingCurrency) || "COP";
  const isTrialing = plan?.status === "trialing";
  const isActive = plan?.status === "active";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Suscripción</h1>
        <p className="text-text-secondary mt-1">Gestiona tu plan y pagos</p>
      </div>

      {/* Payment Pending Banner */}
      {paymentPending && (
        <div className="p-4 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-sm text-accent-cyan flex items-center gap-3">
          <svg
            className="w-5 h-5 animate-spin flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>
            Procesando tu pago con Mercado Pago... Esto puede tardar unos
            segundos.
          </span>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-sm text-accent-green">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-2 text-accent-green/70 hover:text-accent-green"
          >
            ✕
          </button>
        </div>
      )}

      {/* Current Plan */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Plan actual
          </h2>
          {plan && (
            <SubscriptionStatusBadge
              status={plan.status}
              cancelAtPeriodEnd={sub?.cancelAtPeriodEnd}
            />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-text-primary">
              {plan?.name || "Basic"}
            </span>
            {sub && (
              <span className="text-text-muted text-sm">
                {sub.formattedPrice}/mes
              </span>
            )}
          </div>

          {isTrialing && plan?.trialEndsAt && (
            <p className="text-sm text-accent-cyan">
              Tu prueba gratuita termina el{" "}
              {new Date(plan.trialEndsAt).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          {isActive && sub?.currentPeriodEnd && (
            <p className="text-sm text-text-muted">
              Próximo cobro:{" "}
              {new Date(sub.currentPeriodEnd).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          {plan?.status === "pending" && (
            <p className="text-sm text-amber-400">
              Tu suscripción está pendiente de pago. Completa el pago en Mercado
              Pago para activar tu plan.
            </p>
          )}

          {plan?.status === "unpaid" && (
            <p className="text-sm text-accent-red">
              Tu suscripción está suspendida por falta de pago. Selecciona un
              plan para reactivar.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => setShowPlans(!showPlans)}
              disabled={paymentPending}
            >
              {showPlans ? "Ocultar planes" : "Cambiar plan"}
            </GlassButton>

            {isActive && sub && !sub.cancelAtPeriodEnd && (
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                Cancelar suscripción
              </GlassButton>
            )}

            {sub?.cancelAtPeriodEnd && (
              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleReactivate}
                disabled={actionLoading}
              >
                Reactivar suscripción
              </GlassButton>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Plan Selector */}
      {showPlans && (
        <GlassCard padding="lg">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Selecciona un plan
          </h2>
          <PlanSelector
            currentTier={plan?.tier || "basic"}
            currency={currency}
            onSelect={handleSubscribe}
            loading={actionLoading}
          />
          {actionLoading && (
            <div className="mt-4 p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-sm text-accent-cyan">
              Redirigiendo a Mercado Pago...
            </div>
          )}
        </GlassCard>
      )}

      {/* Payment Info — Managed by MP */}
      <GlassCard padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Método de pago
        </h2>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-border-glass">
          <div className="w-10 h-10 rounded-lg bg-[#009ee3]/20 flex items-center justify-center">
            <span className="text-[#009ee3] font-bold text-xs">MP</span>
          </div>
          <div>
            <p className="text-sm text-text-primary">
              Pagos gestionados por Mercado Pago
            </p>
            <p className="text-xs text-text-muted">
              Tus datos de tarjeta son procesados y almacenados de forma segura
              por Mercado Pago. Redbot nunca tiene acceso a tu información
              financiera.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Invoices */}
      <GlassCard padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Historial de facturas
        </h2>
        <InvoiceList invoices={invoices} />
      </GlassCard>
    </div>
  );
}
