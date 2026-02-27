"use client";

import { GlassBadge } from "@/components/ui/glass-badge";
import type { AffiliateCommission, CommissionRate } from "@/lib/affiliates/types";

function formatCOP(cents: number): string {
  const whole = Math.round(cents / 100);
  return `$${whole.toLocaleString("es-CO")}`;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b" },
  approved: { label: "Aprobada", color: "#22c55e" },
  paid: { label: "Pagada", color: "#22c55e" },
  cancelled: { label: "Cancelada", color: "#ef4444" },
};

interface Props {
  commissions: AffiliateCommission[];
  rates: CommissionRate[];
  onRefresh: () => void;
}

export function AffiliateCommissionsTable({ commissions, rates }: Props) {
  return (
    <div className="space-y-4">
      {/* Commission rates info */}
      <div className="flex gap-4 flex-wrap">
        {rates.map((rate) => (
          <div key={rate.plan_tier} className="text-xs text-text-muted">
            <span className="capitalize font-medium text-text-secondary">{rate.plan_tier}:</span>{" "}
            {rate.commission_percent}%
          </div>
        ))}
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Aún no tienes comisiones</p>
          <p className="text-xs mt-1">Las comisiones se generan cuando tus referidos pagan su suscripción</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-glass">
                <th className="text-left py-3 px-4 text-text-muted font-medium">Referido</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Plan</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Base</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Comisión</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Estado</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((comm) => {
                const status = statusConfig[comm.status] || statusConfig.pending;
                return (
                  <tr key={comm.id} className="border-b border-border-glass/50 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-text-primary">
                      {comm.referral?.referred_org?.name || "—"}
                    </td>
                    <td className="py-3 px-4 text-text-secondary capitalize">{comm.plan_tier}</td>
                    <td className="py-3 px-4 text-text-muted text-right">
                      {formatCOP(comm.base_amount_cents)}
                    </td>
                    <td className="py-3 px-4 text-accent-blue font-medium text-right">
                      {formatCOP(comm.commission_amount_cents)}
                      <span className="text-text-muted text-xs ml-1">
                        ({comm.commission_rate_percent}%)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <GlassBadge color={status.color}>{status.label}</GlassBadge>
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {new Date(comm.created_at).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
