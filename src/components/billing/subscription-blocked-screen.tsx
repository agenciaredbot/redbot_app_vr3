import Link from "next/link";

interface SubscriptionBlockedScreenProps {
  reason: "trial_expired" | "unpaid" | "canceled";
  planName?: string;
}

export function SubscriptionBlockedScreen({
  reason,
  planName,
}: SubscriptionBlockedScreenProps) {
  const config = {
    trial_expired: {
      icon: (
        <svg className="w-10 h-10 text-accent-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Tu prueba gratuita ha terminado",
      description: "Tu periodo de prueba de 5 dias del plan Starter ha finalizado. Elige un plan para seguir usando Redbot.",
    },
    unpaid: {
      icon: (
        <svg className="w-10 h-10 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      title: "Tu suscripcion esta suspendida",
      description: planName
        ? `Tu plan ${planName} requiere un pago activo. Reactiva tu suscripcion para continuar.`
        : "Tu cuenta requiere un pago activo para continuar usando Redbot.",
    },
    canceled: {
      icon: (
        <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Tu suscripcion fue cancelada",
      description: "Elige un nuevo plan para reactivar tu cuenta y acceder a todas las funcionalidades.",
    },
  };

  const { icon, title, description } = config[reason];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/95 backdrop-blur-xl">
      <div className="max-w-md mx-auto px-6 text-center space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-white/[0.03] border border-border-glass rounded-full flex items-center justify-center">
          {icon}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>

        {/* Description */}
        <p className="text-text-secondary leading-relaxed">{description}</p>

        {/* CTA */}
        <Link
          href="/admin/billing"
          className="inline-block w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity text-center"
        >
          Elegir un plan
        </Link>

        {/* Help */}
        <p className="text-xs text-text-muted">
          ¿Necesitas ayuda? Contactanos en{" "}
          <a
            href="mailto:soporte@redbot.app"
            className="text-accent-blue hover:underline"
          >
            soporte@redbot.app
          </a>
        </p>
      </div>
    </div>
  );
}
