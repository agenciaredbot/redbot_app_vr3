"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassTabs } from "@/components/ui/glass-tabs";

function formatCOP(cents: number): string {
  const whole = Math.round(cents / 100);
  return `$${whole.toLocaleString("es-CO")}`;
}

interface Affiliate {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  affiliate_type: string;
  status: string;
  referral_code: string;
  total_referrals: number;
  active_referrals: number;
  total_earned_cents: number;
  pending_balance_cents: number;
  payout_method: string | null;
  created_at: string;
}

interface Stats {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingApproval: number;
  totalReferrals: number;
  pendingCommissionsCents: number;
  approvedCommissionsCents: number;
}

interface Rate {
  id: string;
  plan_tier: string;
  commission_percent: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b" },
  active: { label: "Activo", color: "#22c55e" },
  suspended: { label: "Suspendido", color: "#ef4444" },
  rejected: { label: "Rechazado", color: "#94a3b8" },
};

export function SuperAdminAffiliatesClient() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const [affRes, statsRes, ratesRes] = await Promise.all([
        fetch(`/api/super-admin/affiliates?${params}`),
        fetch("/api/super-admin/affiliates/stats"),
        fetch("/api/super-admin/affiliates/rates"),
      ]);

      if (affRes.ok) {
        const data = await affRes.json();
        setAffiliates(data.affiliates);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (ratesRes.ok) {
        const data = await ratesRes.json();
        setRates(data.rates);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await fetch(`/api/super-admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchData();
  };

  const handleRateUpdate = async (planTier: string, newPercent: number) => {
    const updatedRates = rates.map((r) =>
      r.plan_tier === planTier ? { plan_tier: r.plan_tier, commission_percent: newPercent } : { plan_tier: r.plan_tier, commission_percent: r.commission_percent }
    );
    const res = await fetch("/api/super-admin/affiliates/rates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates: updatedRates }),
    });
    if (res.ok) {
      const data = await res.json();
      setRates(data.rates);
    }
  };

  const handlePayout = async (affiliate: Affiliate) => {
    if (!affiliate.payout_method || affiliate.pending_balance_cents <= 0) {
      alert("El afiliado no tiene saldo pendiente o método de pago configurado");
      return;
    }
    const amount = prompt(
      `Monto a pagar en COP centavos (máximo: ${affiliate.pending_balance_cents}):`
    );
    if (!amount) return;
    const reference = prompt("Número de referencia de la transferencia:");

    const res = await fetch("/api/super-admin/affiliates/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affiliate_id: affiliate.id,
        amount_cents: parseInt(amount),
        payout_method: affiliate.payout_method,
        reference_number: reference || undefined,
      }),
    });

    if (res.ok) {
      fetchData();
      alert("Pago procesado exitosamente");
    } else {
      const data = await res.json();
      alert(`Error: ${data.error}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Programa de Afiliados</h1>
        <p className="text-text-muted text-sm mt-1">Gestiona afiliados, comisiones y pagos</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Afiliados", value: stats.totalAffiliates, color: "text-accent-blue" },
            { label: "Pendientes Aprobación", value: stats.pendingApproval, color: "text-accent-orange" },
            { label: "Comisiones Pendientes", value: formatCOP(stats.pendingCommissionsCents), color: "text-purple-400" },
            { label: "Comisiones Aprobadas", value: formatCOP(stats.approvedCommissionsCents), color: "text-green-400" },
          ].map((stat) => (
            <div key={stat.label} className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-2xl p-5">
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-xs text-text-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <GlassTabs
        tabs={[
          {
            id: "affiliates",
            label: "Afiliados",
            content: (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  {["", "pending", "active", "suspended"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        statusFilter === s
                          ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                          : "bg-white/[0.05] text-text-muted border border-border-glass hover:text-text-secondary"
                      }`}
                    >
                      {s === "" ? "Todos" : statusConfig[s]?.label || s}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-blue" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-glass">
                          <th className="text-left py-3 px-4 text-text-muted font-medium">Nombre</th>
                          <th className="text-left py-3 px-4 text-text-muted font-medium">Tipo</th>
                          <th className="text-left py-3 px-4 text-text-muted font-medium">Código</th>
                          <th className="text-right py-3 px-4 text-text-muted font-medium">Referidos</th>
                          <th className="text-right py-3 px-4 text-text-muted font-medium">Saldo</th>
                          <th className="text-left py-3 px-4 text-text-muted font-medium">Estado</th>
                          <th className="text-right py-3 px-4 text-text-muted font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliates.map((aff) => {
                          const st = statusConfig[aff.status] || statusConfig.pending;
                          return (
                            <tr key={aff.id} className="border-b border-border-glass/50 hover:bg-white/[0.02]">
                              <td className="py-3 px-4">
                                <p className="text-text-primary font-medium">{aff.display_name}</p>
                                <p className="text-text-muted text-xs">{aff.email}</p>
                              </td>
                              <td className="py-3 px-4">
                                <GlassBadge color={aff.affiliate_type === "tenant" ? "#22c55e" : "#94a3b8"}>
                                  {aff.affiliate_type === "tenant" ? "Tenant" : "Externo"}
                                </GlassBadge>
                              </td>
                              <td className="py-3 px-4 font-mono text-xs text-accent-blue">{aff.referral_code}</td>
                              <td className="py-3 px-4 text-right text-text-secondary">{aff.total_referrals}</td>
                              <td className="py-3 px-4 text-right text-text-primary font-medium">{formatCOP(aff.pending_balance_cents)}</td>
                              <td className="py-3 px-4">
                                <GlassBadge color={st.color}>{st.label}</GlassBadge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex gap-2 justify-end">
                                  {aff.status === "pending" && (
                                    <GlassButton size="sm" onClick={() => handleStatusChange(aff.id, "active")}>
                                      Aprobar
                                    </GlassButton>
                                  )}
                                  {aff.status === "active" && (
                                    <>
                                      <GlassButton size="sm" variant="secondary" onClick={() => handlePayout(aff)}>
                                        Pagar
                                      </GlassButton>
                                      <GlassButton size="sm" variant="ghost" onClick={() => handleStatusChange(aff.id, "suspended")}>
                                        Suspender
                                      </GlassButton>
                                    </>
                                  )}
                                  {aff.status === "suspended" && (
                                    <GlassButton size="sm" onClick={() => handleStatusChange(aff.id, "active")}>
                                      Reactivar
                                    </GlassButton>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {affiliates.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-text-muted">
                              No hay afiliados {statusFilter ? `con estado "${statusConfig[statusFilter]?.label}"` : ""}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: "rates",
            label: "Tasas de Comisión",
            content: (
              <div className="max-w-md space-y-4">
                <p className="text-text-muted text-sm">Configura el porcentaje de comisión por plan</p>
                {rates.map((rate) => (
                  <div key={rate.plan_tier} className="flex items-center gap-4 backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-xl p-4">
                    <span className="text-text-primary font-medium capitalize w-20">{rate.plan_tier}</span>
                    <input
                      type="number"
                      value={rate.commission_percent}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                          setRates((prev) =>
                            prev.map((r) =>
                              r.plan_tier === rate.plan_tier ? { ...r, commission_percent: v } : r
                            )
                          );
                        }
                      }}
                      min={0}
                      max={100}
                      step={0.5}
                      className="w-24 px-3 py-2 rounded-lg bg-white/[0.05] border border-border-glass text-text-primary text-sm text-center"
                    />
                    <span className="text-text-muted text-sm">%</span>
                    <GlassButton
                      size="sm"
                      onClick={() => handleRateUpdate(rate.plan_tier, rate.commission_percent)}
                    >
                      Guardar
                    </GlassButton>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
