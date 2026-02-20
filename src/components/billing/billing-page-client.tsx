"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { SubscriptionStatusBadge } from "./subscription-status";
import { PlanSelector } from "./plan-selector";
import { PaymentMethodForm } from "./payment-method-form";
import { InvoiceList } from "./invoice-list";
import { PLANS, formatPrice } from "@/config/plans";
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

interface PaymentMethod {
  id: string;
  type: string;
  last_four: string;
  brand: string;
  is_default: boolean;
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Holds the selected plan tier when user needs to enter card for subscription
  const [pendingSubscribeTier, setPendingSubscribeTier] = useState<PlanTier | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, pmRes, invRes] = await Promise.all([
        fetch("/api/billing/status"),
        fetch("/api/billing/payment-methods"),
        fetch("/api/billing/invoices"),
      ]);

      const [statusData, pmData, invData] = await Promise.all([
        statusRes.json(),
        pmRes.json(),
        invRes.json(),
      ]);

      if (statusRes.ok) setBillingStatus(statusData);
      if (pmRes.ok) setPaymentMethods(pmData.paymentMethods || []);
      if (invRes.ok) setInvoices(invData.invoices || []);
    } catch {
      setError("Error al cargar información de facturación");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Subscribe flow:
   * 1. User selects a plan → handleSubscribe(tier)
   * 2. If already subscribed with active sub → change plan via API
   * 3. If not subscribed → show card form (tokenize + subscribe in one step)
   */
  const handleSubscribe = async (tier: PlanTier) => {
    const isChangePlan = billingStatus?.subscription?.status === "active";

    if (isChangePlan) {
      // Change plan — no new card needed, just API call
      setActionLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/billing/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planTier: tier }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error);
        }

        setSuccess(`Plan cambiado a ${PLANS[tier].name}`);
        setShowPlans(false);
        await fetchAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cambiar plan");
      } finally {
        setActionLoading(false);
      }
    } else {
      // New subscription — show card form for tokenization + subscribe
      setPendingSubscribeTier(tier);
      setShowAddCard(true);
    }
  };

  /**
   * Called by PaymentMethodForm after successful tokenization.
   * Sends the token to /api/billing/subscribe to create the MP subscription.
   */
  const handleTokenized = async (data: {
    cardTokenId: string;
    payerEmail: string;
    cardLastFour: string;
    cardBrand: string;
  }) => {
    if (!pendingSubscribeTier) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier: pendingSubscribeTier,
          cardTokenId: data.cardTokenId,
          payerEmail: data.payerEmail,
          cardLastFour: data.cardLastFour,
          cardBrand: data.cardBrand,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error);
      }

      setSuccess(`Suscrito al plan ${PLANS[pendingSubscribeTier].name}`);
      setShowAddCard(false);
      setShowPlans(false);
      setPendingSubscribeTier(null);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al suscribirse");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("¿Estás seguro de que deseas cancelar tu suscripción? Se mantendrá activa hasta el final del período actual.")) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccess("Suscripción programada para cancelar al final del período");
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

      setSuccess("Cancelación revertida. Tu suscripción continuará activa.");
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reactivar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePaymentMethod = async (pmId: string) => {
    if (!confirm("¿Eliminar este método de pago?")) return;

    try {
      const res = await fetch("/api/billing/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
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

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-200">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-sm text-accent-green">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 text-accent-green/70 hover:text-accent-green">
            ✕
          </button>
        </div>
      )}

      {/* Current Plan */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Plan actual</h2>
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
              Próximo cobro: {new Date(sub.currentPeriodEnd).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          {plan?.status === "unpaid" && (
            <p className="text-sm text-accent-red">
              Tu suscripción está suspendida por falta de pago. Selecciona un plan para reactivar.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowPlans(!showPlans);
                if (!showPlans) {
                  setShowAddCard(false);
                  setPendingSubscribeTier(null);
                }
              }}
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
      {showPlans && !showAddCard && (
        <GlassCard padding="lg">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Selecciona un plan</h2>
          <PlanSelector
            currentTier={plan?.tier || "basic"}
            currency={currency}
            onSelect={handleSubscribe}
            loading={actionLoading}
          />
        </GlassCard>
      )}

      {/* Card Form for Subscription */}
      {showAddCard && pendingSubscribeTier && (
        <GlassCard padding="lg">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Suscribirse a {PLANS[pendingSubscribeTier].name}
          </h2>
          <p className="text-sm text-text-muted mb-4">
            {formatPrice(getPlanPriceCOP(pendingSubscribeTier), "COP")}/mes
          </p>
          <PaymentMethodForm
            mode="subscribe"
            onTokenized={handleTokenized}
            onCancel={() => {
              setShowAddCard(false);
              setPendingSubscribeTier(null);
            }}
          />
          {actionLoading && (
            <div className="mt-4 p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-sm text-accent-cyan">
              Creando suscripción...
            </div>
          )}
        </GlassCard>
      )}

      {/* Payment Methods */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Método de pago</h2>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-6">
            <svg
              className="w-12 h-12 text-text-muted mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
            <p className="text-sm text-text-muted mb-3">
              Tu tarjeta se guardará al suscribirte a un plan
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-border-glass"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded bg-white/[0.08] flex items-center justify-center">
                    <span className="text-xs font-medium text-text-secondary uppercase">
                      {pm.brand?.slice(0, 4) || "CARD"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">
                      •••• {pm.last_four}
                    </p>
                    <p className="text-xs text-text-muted capitalize">
                      {pm.brand} {pm.is_default && "· Por defecto"}
                    </p>
                  </div>
                </div>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePaymentMethod(pm.id)}
                >
                  Eliminar
                </GlassButton>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Invoices */}
      <GlassCard padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Historial de facturas</h2>
        <InvoiceList invoices={invoices} />
      </GlassCard>
    </div>
  );
}

/**
 * Helper to get COP price for display
 */
function getPlanPriceCOP(tier: PlanTier): number {
  return PLANS[tier].priceCOPCents;
}
