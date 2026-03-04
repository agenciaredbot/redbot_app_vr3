import Link from "next/link";
import { AffiliateRegisterForm } from "@/components/affiliates/affiliate-register-form";
import { PLANS } from "@/config/plans";

export const metadata = {
  title: "Programa de Afiliados — Gana dinero refiriendo inmobiliarias | Redbot",
  description:
    "Gana comisiones recurrentes de hasta el 20% por cada inmobiliaria que refieras a Redbot. Sin inversión, con tracking automático y pagos mensuales.",
  openGraph: {
    title: "Programa de Afiliados — Redbot",
    description:
      "Comisiones recurrentes de hasta 20% por referir inmobiliarias. Regístrate gratis.",
  },
};

/* ── Inline sub-components ── */

function SectionBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-widest rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
      {text}
    </span>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <svg
        className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-red to-accent-indigo flex items-center justify-center mb-4 mx-auto">
      <span className="text-lg font-bold text-white">{n}</span>
    </div>
  );
}

/* ── Earnings data ── */

const commissionPerMonth = {
  starter: Math.round(
    (PLANS.basic.priceCOPCents / 100) *
      (PLANS.basic.defaultCommissionPercent / 100)
  ),
  power: Math.round(
    (PLANS.power.priceCOPCents / 100) *
      (PLANS.power.defaultCommissionPercent / 100)
  ),
  omni: Math.round(
    (PLANS.omni.priceCOPCents / 100) *
      (PLANS.omni.defaultCommissionPercent / 100)
  ),
};

const earningsScenarios = [
  {
    referrals: 5,
    starter: 3,
    power: 1,
    omni: 1,
  },
  {
    referrals: 10,
    starter: 5,
    power: 3,
    omni: 2,
  },
  {
    referrals: 20,
    starter: 8,
    power: 7,
    omni: 5,
  },
  {
    referrals: 50,
    starter: 20,
    power: 18,
    omni: 12,
    highlight: true,
  },
];

function calcMonthly(s: (typeof earningsScenarios)[number]) {
  return (
    s.starter * commissionPerMonth.starter +
    s.power * commissionPerMonth.power +
    s.omni * commissionPerMonth.omni
  );
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-CO")}`;
}

/* ══════════════════════════════════════════════════════════════ */

export default function AfiliadosPage() {
  return (
    <div className="scroll-smooth">
      {/* ── S1: HERO ── */}
      <section className="pt-28 md:pt-36 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <SectionBadge text="Programa de Afiliados" />

          <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold leading-tight font-[family-name:var(--font-poppins)]">
            Gana dinero refiriendo
            <br />
            inmobiliarias a{" "}
            <span className="bg-gradient-to-r from-accent-red to-accent-indigo bg-clip-text text-transparent">
              Redbot
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            Obtén comisiones recurrentes cada mes por cada agencia inmobiliaria
            que refieras. Sin inversión, sin complicaciones y con tracking
            automático.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#registro"
              className="w-full sm:w-auto px-10 py-4 text-base font-semibold rounded-2xl bg-gradient-to-r from-accent-red to-accent-indigo text-white hover:opacity-90 transition-opacity shadow-lg shadow-accent-red/20"
            >
              Registrarme como afiliado
            </Link>
            <Link
              href="#comisiones"
              className="w-full sm:w-auto px-10 py-4 text-base font-semibold rounded-2xl border border-border-glass text-text-primary hover:bg-bg-glass-hover transition-colors"
            >
              Ver comisiones
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "Hasta 20%", label: "comisión por referido" },
              { value: "Recurrente", label: "ingreso mensual" },
              { value: "30 días", label: "cookie de seguimiento" },
              { value: "$0", label: "inversión necesaria" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-5"
              >
                <p className="text-2xl font-bold bg-gradient-to-r from-accent-red to-accent-indigo bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-text-muted mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S2: PARA QUIÉN ES ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Para quién es" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Si conoces agentes inmobiliarios, esto es para ti
            </h2>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              No necesitas ser experto en tecnología. Solo necesitas tu red de
              contactos en el sector inmobiliario.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Target profiles */}
            <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-text-primary mb-6">
                Perfiles ideales
              </h3>
              <div className="space-y-4 text-text-secondary">
                {[
                  {
                    emoji: "🏠",
                    text: "Agentes inmobiliarios independientes",
                  },
                  { emoji: "💼", text: "Consultores del sector inmobiliario" },
                  {
                    emoji: "📱",
                    text: "Influencers y creadores de contenido inmobiliario",
                  },
                  {
                    emoji: "🎓",
                    text: "Coaches y formadores de bienes raíces",
                  },
                  {
                    emoji: "👥",
                    text: "Líderes de comunidades de agentes en redes",
                  },
                  {
                    emoji: "🏢",
                    text: "Administradores de grupos inmobiliarios",
                  },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Why it works */}
            <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-text-primary mb-6">
                Por qué funciona
              </h3>
              <div className="space-y-5 text-text-secondary">
                <CheckItem>
                  Redbot resuelve un dolor real: atender clientes 24/7,
                  gestionar leads y automatizar WhatsApp
                </CheckItem>
                <CheckItem>
                  Cada agencia que refieras se convierte en una comisión mensual
                  recurrente mientras siga activa
                </CheckItem>
                <CheckItem>
                  El producto se vende solo — la demo de IA y 5 días de prueba
                  gratis convencen
                </CheckItem>
                <CheckItem>
                  No necesitas hacer &quot;hard selling&quot;. Solo comparte tu
                  link y Redbot hace el resto
                </CheckItem>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── S3: CÓMO FUNCIONA ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Cómo funciona" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              3 pasos para empezar a ganar
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                title: "Regístrate",
                desc: "Crea tu cuenta de afiliado gratis. Nuestro equipo revisa tu perfil y te activa en menos de 24 horas. Recibes tu link de referido único.",
              },
              {
                step: 2,
                title: "Comparte tu link",
                desc: "Envía tu link a agentes e inmobiliarias que conoces. Nuestra cookie de 30 días rastrea automáticamente todos los registros desde tu enlace.",
              },
              {
                step: 3,
                title: "Gana comisiones",
                desc: "Cada vez que un referido paga su suscripción mensual, tu comisión se calcula automáticamente. Consulta tus ganancias en tiempo real desde tu dashboard.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-8 text-center"
              >
                <StepNumber n={item.step} />
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S4: COMISIONES ── */}
      <section
        id="comisiones"
        className="py-20 md:py-28 px-6 border-t border-border-glass"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Comisiones" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Comisiones recurrentes por cada referido
            </h2>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              Ganas un porcentaje de cada pago mensual mientras tu referido siga
              activo. No es una comisión única.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {(["basic", "power", "omni"] as const).map((tier) => {
              const plan = PLANS[tier];
              const monthlyPrice = plan.priceCOPCents / 100;
              const commission = Math.round(
                monthlyPrice * (plan.defaultCommissionPercent / 100)
              );
              const isPower = tier === "power";

              return (
                <div
                  key={tier}
                  className={`relative bg-bg-glass backdrop-blur-xl border rounded-2xl p-8 text-center ${
                    isPower
                      ? "border-2 border-accent-blue/40"
                      : "border-border-glass"
                  }`}
                >
                  {isPower && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-accent-blue text-white">
                        Popular
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-text-muted mb-1">{plan.name}</p>
                  <p className="text-sm text-text-secondary mb-4">
                    {fmt(monthlyPrice)} COP/mes
                  </p>

                  <p className="text-5xl font-bold bg-gradient-to-r from-accent-red to-accent-indigo bg-clip-text text-transparent">
                    {plan.defaultCommissionPercent}%
                  </p>
                  <p className="text-xs text-text-muted mt-2 mb-6">
                    comisión por pago
                  </p>

                  <div className="pt-4 border-t border-border-glass">
                    <p className="text-xl font-bold text-accent-green">
                      {fmt(commission)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      por referido / por mes
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── S5: TABLA DE GANANCIAS ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Potencial de ganancias" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Cuánto puedes ganar como afiliado
            </h2>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              Proyecciones basadas en una mezcla realista de planes
            </p>
          </div>

          <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-glass">
                    <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Referidos
                    </th>
                    <th className="px-4 md:px-6 py-4 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Starter
                    </th>
                    <th className="px-4 md:px-6 py-4 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Power
                    </th>
                    <th className="px-4 md:px-6 py-4 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Omni
                    </th>
                    <th className="px-4 md:px-6 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Ingreso/mes
                    </th>
                    <th className="px-4 md:px-6 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Ingreso/año
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {earningsScenarios.map((row) => {
                    const monthly = calcMonthly(row);
                    const annual = monthly * 12;
                    return (
                      <tr
                        key={row.referrals}
                        className={`border-b border-border-glass/50 ${
                          row.highlight ? "bg-accent-green/5" : ""
                        }`}
                      >
                        <td className="px-4 md:px-6 py-4 font-semibold text-text-primary">
                          {row.referrals}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center text-text-secondary">
                          {row.starter}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center text-text-secondary">
                          {row.power}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center text-text-secondary">
                          {row.omni}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right font-semibold text-accent-green">
                          {fmt(monthly)}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right font-bold text-accent-green">
                          {fmt(annual)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-6 py-4 text-xs text-text-muted border-t border-border-glass/50">
              * Proyecciones basadas en comisiones recurrentes mensuales. Los
              ingresos reales dependen de los planes que escojan tus referidos.
            </p>
          </div>
        </div>
      </section>

      {/* ── S6: VENTAJAS ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Ventajas" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Por qué unirte al programa de{" "}
              <span className="bg-gradient-to-r from-accent-red to-accent-indigo bg-clip-text text-transparent">
                Redbot
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                    />
                  </svg>
                ),
                title: "Comisiones recurrentes",
                desc: "Ganas cada mes mientras tu referido siga activo. No es una comisión única — es ingreso pasivo real.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                    />
                  </svg>
                ),
                title: "Link de referido único",
                desc: "Cookie de 30 días que rastrea automáticamente todos tus referidos. Sin importar cuándo se registren.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                ),
                title: "Dashboard en tiempo real",
                desc: "Consulta tus ganancias, referidos activos, comisiones pendientes y pagos completados desde tu panel.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                ),
                title: "Producto que se vende solo",
                desc: "IA que atiende WhatsApp + portal web inmobiliario. 5 días de prueba gratis convencen a cualquier agente.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                    />
                  </svg>
                ),
                title: "Mercado en crecimiento",
                desc: "El sector inmobiliario colombiano adopta tecnología rápidamente. Cada día más agencias buscan automatizar.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                    />
                  </svg>
                ),
                title: "Sin inversión",
                desc: "Regístrate completamente gratis. Solo necesitas tu red de contactos del sector inmobiliario.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/20 to-accent-indigo/20 flex items-center justify-center text-accent-blue mb-4">
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S7: REGISTRO ── */}
      <section
        id="registro"
        className="py-20 md:py-28 px-6 border-t border-border-glass"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <SectionBadge text="Regístrate" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Empieza a ganar comisiones{" "}
              <span className="bg-gradient-to-r from-accent-red to-accent-indigo bg-clip-text text-transparent">
                hoy
              </span>
            </h2>
            <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto">
              Completa el formulario y nuestro equipo revisará tu solicitud en
              menos de 24 horas.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-8">
              <AffiliateRegisterForm />
            </div>

            <div className="mt-8 space-y-3 text-sm text-text-muted">
              <CheckItem>
                Comisiones recurrentes mensuales mientras tu referido esté activo
              </CheckItem>
              <CheckItem>
                Link de referido único con tracking automático por 30 días
              </CheckItem>
              <CheckItem>
                Dashboard con métricas en tiempo real de tus ganancias
              </CheckItem>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
