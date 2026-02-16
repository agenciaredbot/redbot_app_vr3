import { GlassCard } from "@/components/ui/glass-card";
import Link from "next/link";

export default function TenantNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <GlassCard padding="lg" className="max-w-md text-center">
        <p className="text-6xl font-bold text-text-muted mb-4">404</p>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Página no encontrada
        </h2>
        <p className="text-text-secondary mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Volver al inicio
        </Link>
      </GlassCard>
    </div>
  );
}
