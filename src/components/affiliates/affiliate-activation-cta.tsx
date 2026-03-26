"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { PLANS } from "@/config/plans";

interface Props {
  userRole: string;
  hasOrg: boolean;
}

export function AffiliateActivationCta({ userRole, hasOrg }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canActivate = userRole === "org_admin" && hasOrg;

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliates/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al activar");
      }
      setSuccess(true);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-2xl p-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Gana Comisiones Refiriendo Clientes
        </h2>
        <p className="text-text-muted mb-6">
          Activa tu cuenta de afiliado y gana comisiones recurrentes mensuales
          cada vez que un cliente referido por ti se suscriba a un plan.
        </p>

        {/* Commission rates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(["lite", "basic", "power", "omni"] as const).map((tier) => (
            <div
              key={tier}
              className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-xl p-4"
            >
              <p className="text-sm text-text-muted mb-1">{PLANS[tier].name}</p>
              <p className="text-2xl font-bold text-accent-blue">
                {PLANS[tier].defaultCommissionPercent}%
              </p>
              <p className="text-xs text-text-muted mt-1">por pago mensual</p>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {success ? (
          <p className="text-green-400 font-medium">
            Tu cuenta de afiliado ha sido activada exitosamente.
          </p>
        ) : canActivate ? (
          <GlassButton onClick={handleActivate} disabled={loading}>
            {loading ? "Activando..." : "Activar Programa de Afiliados"}
          </GlassButton>
        ) : (
          <p className="text-text-muted text-sm">
            Solo los administradores de organización pueden activar el programa de afiliados.
          </p>
        )}
      </div>
    </div>
  );
}
