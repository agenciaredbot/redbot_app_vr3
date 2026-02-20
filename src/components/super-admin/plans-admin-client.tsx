"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { formatPrice } from "@/config/plans";

interface PlanData {
  tier: string;
  name: string;
  priceCOPCents: number;
  priceUSDCents: number;
  trialDays: number;
  limits: {
    maxProperties: number;
    maxAgents: number;
    maxConversationsPerMonth: number;
    customTags: boolean;
    agentCustomization: string;
    exportLeads: boolean;
    customDomain: boolean;
  };
  orgCount: number;
  monthlyRevenueCents: number;
}

interface Totals {
  totalOrgs: number;
  totalMonthlyRevenueCents: number;
  activeSubs: number;
}

export function PlansAdminClient() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [editPriceCOP, setEditPriceCOP] = useState("");
  const [editPriceUSD, setEditPriceUSD] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/plans");
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans || []);
        setTotals(data.totals || null);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const startEdit = (plan: PlanData) => {
    setEditingTier(plan.tier);
    setEditPriceCOP(String(plan.priceCOPCents / 100)); // Show in pesos, not centavos
    setEditPriceUSD(String(plan.priceUSDCents / 100));
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingTier(null);
    setEditPriceCOP("");
    setEditPriceUSD("");
  };

  const saveEdit = async () => {
    if (!editingTier) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/super-admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: editingTier,
          priceCOPCents: Math.round(Number(editPriceCOP) * 100),
          priceUSDCents: Math.round(Number(editPriceUSD) * 100),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setEditingTier(null);
        await fetchPlans();
      } else {
        setMessage(data.error || "Error al guardar");
      }
    } catch {
      setMessage("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Planes</h1>
        <GlassCard padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/[0.05] rounded w-1/3" />
            <div className="h-8 bg-white/[0.05] rounded w-1/2" />
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Planes</h1>
        <p className="text-text-secondary mt-1">Gestiona los planes y precios de Redbot</p>
      </div>

      {/* Revenue Stats */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard padding="md">
            <p className="text-sm text-text-muted">Organizaciones totales</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{totals.totalOrgs}</p>
          </GlassCard>
          <GlassCard padding="md">
            <p className="text-sm text-text-muted">Suscripciones activas</p>
            <p className="text-2xl font-bold text-accent-green mt-1">{totals.activeSubs}</p>
          </GlassCard>
          <GlassCard padding="md">
            <p className="text-sm text-text-muted">Ingreso mensual recurrente</p>
            <p className="text-2xl font-bold text-accent-blue mt-1">
              {formatPrice(totals.totalMonthlyRevenueCents, "COP")}
            </p>
          </GlassCard>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-sm text-text-secondary">
          {message}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isEditing = editingTier === plan.tier;

          return (
            <GlassCard key={plan.tier} padding="lg">
              <div className="space-y-4">
                {/* Plan header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-text-primary">{plan.name}</h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/[0.05] text-text-muted">
                    {plan.orgCount} orgs
                  </span>
                </div>

                {/* Pricing */}
                {isEditing ? (
                  <div className="space-y-3">
                    <GlassInput
                      label="Precio COP (pesos)"
                      type="number"
                      value={editPriceCOP}
                      onChange={(e) => setEditPriceCOP(e.target.value)}
                      placeholder="80000"
                    />
                    <GlassInput
                      label="Precio USD (dólares)"
                      type="number"
                      value={editPriceUSD}
                      onChange={(e) => setEditPriceUSD(e.target.value)}
                      placeholder="20"
                    />
                    <div className="flex gap-2">
                      <GlassButton
                        size="sm"
                        onClick={saveEdit}
                        loading={saving}
                      >
                        Guardar
                      </GlassButton>
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                      >
                        Cancelar
                      </GlassButton>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-text-primary">
                        {formatPrice(plan.priceCOPCents, "COP")}
                      </span>
                      <span className="text-sm text-text-muted">/mes</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {formatPrice(plan.priceUSDCents, "USD")} /mes (USD)
                    </p>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => startEdit(plan)}
                    >
                      Editar precios
                    </GlassButton>
                  </div>
                )}

                {/* Revenue */}
                {plan.monthlyRevenueCents > 0 && (
                  <div className="pt-3 border-t border-border-glass">
                    <p className="text-xs text-text-muted">Ingreso mensual</p>
                    <p className="text-sm font-medium text-accent-green">
                      {formatPrice(plan.monthlyRevenueCents, "COP")}
                    </p>
                  </div>
                )}

                {/* Limits */}
                <div className="pt-3 border-t border-border-glass space-y-2">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Límites
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Propiedades:</span>{" "}
                      <span className="text-text-primary font-medium">
                        {plan.limits.maxProperties === -1
                          ? "Ilimitadas"
                          : plan.limits.maxProperties}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Agentes:</span>{" "}
                      <span className="text-text-primary font-medium">
                        {plan.limits.maxAgents === -1
                          ? "Ilimitados"
                          : plan.limits.maxAgents}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Conv/mes:</span>{" "}
                      <span className="text-text-primary font-medium">
                        {plan.limits.maxConversationsPerMonth}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Trial:</span>{" "}
                      <span className="text-text-primary font-medium">
                        {plan.trialDays} días
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {plan.limits.customTags && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue">
                        Tags
                      </span>
                    )}
                    {plan.limits.exportLeads && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green">
                        Export
                      </span>
                    )}
                    {plan.limits.customDomain && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple">
                        Dominio
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted">
                      {plan.limits.agentCustomization === "full"
                        ? "Full custom"
                        : "Basic custom"}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Help note */}
      <GlassCard padding="md">
        <p className="text-xs text-text-muted">
          Los precios se definen en <code className="text-text-secondary">src/config/plans.ts</code>.
          Los cambios desde esta UI son informativos. Para hacerlos permanentes, actualiza el archivo y redespliega.
          En una futura versión, los precios se almacenarán en la base de datos para gestión dinámica.
        </p>
      </GlassCard>
    </div>
  );
}
