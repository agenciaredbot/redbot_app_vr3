"use client";

import { GlassBadge } from "@/components/ui/glass-badge";
import type { AffiliateReferral } from "@/lib/affiliates/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b" },
  active: { label: "Activo", color: "#22c55e" },
  churned: { label: "Cancelado", color: "#ef4444" },
  cancelled: { label: "Anulado", color: "#94a3b8" },
};

interface Props {
  referrals: AffiliateReferral[];
  onRefresh: () => void;
}

export function AffiliateReferralsTable({ referrals }: Props) {
  if (referrals.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <p className="text-sm">Aún no tienes referidos</p>
        <p className="text-xs mt-1">Comparte tu link para empezar a ganar comisiones</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-glass">
            <th className="text-left py-3 px-4 text-text-muted font-medium">Organización</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Plan</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Estado</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {referrals.map((ref) => {
            const status = statusConfig[ref.status] || statusConfig.pending;
            return (
              <tr key={ref.id} className="border-b border-border-glass/50 hover:bg-white/[0.02]">
                <td className="py-3 px-4 text-text-primary font-medium">
                  {ref.referred_org?.name || "—"}
                </td>
                <td className="py-3 px-4 text-text-secondary capitalize">
                  {ref.referred_org?.plan_tier || ref.referred_plan_tier || "—"}
                </td>
                <td className="py-3 px-4">
                  <GlassBadge color={status.color}>{status.label}</GlassBadge>
                </td>
                <td className="py-3 px-4 text-text-muted">
                  {new Date(ref.referred_at).toLocaleDateString("es-CO")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
