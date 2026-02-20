"use client";

import { formatPrice } from "@/config/plans";
import type { BillingCurrency } from "@/lib/billing/types";

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

interface InvoiceListProps {
  invoices: Invoice[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  paid: { label: "Pagado", color: "text-accent-green" },
  pending: { label: "Pendiente", color: "text-accent-orange" },
  failed: { label: "Fallido", color: "text-accent-red" },
  refunded: { label: "Reembolsado", color: "text-accent-cyan" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-muted">No hay facturas aún</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-glass">
      {invoices.map((inv) => {
        const statusInfo = statusLabels[inv.status] || statusLabels.pending;

        return (
          <div
            key={inv.id}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div className="space-y-0.5">
              <p className="text-sm text-text-primary">
                {formatDate(inv.periodStart)} — {formatDate(inv.periodEnd)}
              </p>
              <p className="text-xs text-text-muted">
                {inv.paidAt ? `Pagado el ${formatDate(inv.paidAt)}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-text-primary">
                {formatPrice(inv.amountCents, inv.currency as BillingCurrency)}
              </span>
              <span className={`text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
