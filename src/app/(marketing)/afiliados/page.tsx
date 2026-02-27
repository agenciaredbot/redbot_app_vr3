import { AffiliateRegisterForm } from "@/components/affiliates/affiliate-register-form";
import { PLANS } from "@/config/plans";

export const metadata = {
  title: "Programa de Afiliados — Redbot",
  description: "Gana comisiones recurrentes refiriendo inmobiliarias a Redbot",
};

export default function AfiliadosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Programa de Afiliados
          </h1>
          <p className="text-text-muted">
            Gana comisiones recurrentes cada vez que un cliente referido por ti
            pague su suscripción mensual.
          </p>
        </div>

        {/* Commission rates preview */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {(["basic", "power", "omni"] as const).map((tier) => (
            <div
              key={tier}
              className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-xl p-4 text-center"
            >
              <p className="text-xs text-text-muted mb-1">{PLANS[tier].name}</p>
              <p className="text-2xl font-bold text-accent-blue">
                {PLANS[tier].defaultCommissionPercent}%
              </p>
              <p className="text-[10px] text-text-muted mt-1">por pago mensual</p>
            </div>
          ))}
        </div>

        {/* Registration form */}
        <div className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-2xl p-8">
          <AffiliateRegisterForm />
        </div>

        {/* Benefits */}
        <div className="mt-8 space-y-3 text-sm text-text-muted">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Comisiones recurrentes mensuales mientras tu referido esté activo</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Link de referido único con tracking automático por 30 días</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Dashboard con métricas en tiempo real de tus ganancias</span>
          </div>
        </div>
      </div>
    </div>
  );
}
