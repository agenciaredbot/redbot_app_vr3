"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassBadge } from "@/components/ui/glass-badge";
import type { AffiliatePayout } from "@/lib/affiliates/types";

function formatCOP(cents: number): string {
  const whole = Math.round(cents / 100);
  return `$${whole.toLocaleString("es-CO")}`;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b" },
  processing: { label: "Procesando", color: "#94a3b8" },
  completed: { label: "Completado", color: "#22c55e" },
  failed: { label: "Fallido", color: "#ef4444" },
};

const methodLabels: Record<string, string> = {
  nequi: "Nequi",
  bank_transfer: "Transferencia bancaria",
  other: "Otro",
};

interface Props {
  onRefresh: () => void;
}

export function AffiliatePayoutsTable({ onRefresh }: Props) {
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliates/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts);
      }
    } catch (err) {
      console.error("Error fetching payouts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Call onRefresh to keep parent in sync
  useEffect(() => { void onRefresh; }, [onRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-blue" />
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        <p className="text-sm">Aún no tienes pagos registrados</p>
        <p className="text-xs mt-1">Los pagos se procesarán cuando acumules saldo suficiente</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-glass">
            <th className="text-left py-3 px-4 text-text-muted font-medium">Monto</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Método</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Estado</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Referencia</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => {
            const status = statusConfig[payout.status] || statusConfig.pending;
            return (
              <tr key={payout.id} className="border-b border-border-glass/50 hover:bg-white/[0.02]">
                <td className="py-3 px-4 text-text-primary font-medium">
                  {formatCOP(payout.amount_cents)}
                </td>
                <td className="py-3 px-4 text-text-secondary">
                  {methodLabels[payout.payout_method] || payout.payout_method}
                </td>
                <td className="py-3 px-4">
                  <GlassBadge color={status.color}>{status.label}</GlassBadge>
                </td>
                <td className="py-3 px-4 text-text-muted font-mono text-xs">
                  {payout.reference_number || "—"}
                </td>
                <td className="py-3 px-4 text-text-muted">
                  {new Date(payout.created_at).toLocaleDateString("es-CO")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
