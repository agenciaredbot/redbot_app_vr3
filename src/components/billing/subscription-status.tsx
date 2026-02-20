"use client";

interface SubscriptionStatusProps {
  status: string;
  cancelAtPeriodEnd?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  trialing: { label: "Prueba gratuita", color: "text-accent-cyan", bgColor: "bg-accent-cyan/10 border-accent-cyan/20" },
  active: { label: "Activo", color: "text-accent-green", bgColor: "bg-accent-green/10 border-accent-green/20" },
  past_due: { label: "Pago pendiente", color: "text-accent-orange", bgColor: "bg-accent-orange/10 border-accent-orange/20" },
  canceled: { label: "Cancelado", color: "text-text-muted", bgColor: "bg-white/[0.05] border-border-glass" },
  unpaid: { label: "Suspendido", color: "text-accent-red", bgColor: "bg-accent-red/10 border-accent-red/20" },
};

export function SubscriptionStatusBadge({ status, cancelAtPeriodEnd }: SubscriptionStatusProps) {
  const config = statusConfig[status] || statusConfig.active;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${config.bgColor} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color.replace("text-", "bg-")}`} />
      {cancelAtPeriodEnd ? "Se cancela al final del período" : config.label}
    </span>
  );
}
