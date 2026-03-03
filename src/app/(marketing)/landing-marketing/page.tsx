import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Redbot — Tu agente inmobiliario IA, siempre disponible",
  description:
    "Multiplica las ventas de tu inmobiliaria con inteligencia artificial. Agente IA 24/7, CRM integrado, catálogo de propiedades y más. Hecho para Colombia.",
  openGraph: {
    title: "Redbot — Tu agente inmobiliario IA",
    description:
      "Automatiza la atención, captura leads y gestiona tu inmobiliaria desde un solo lugar.",
    type: "website",
  },
};

/* ─── Reusable sub-components ─── */

function SectionBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-widest rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
      {text}
    </span>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="group relative bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-6 hover:border-border-glass-hover hover:bg-bg-glass-hover transition-all duration-300">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${accent}`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-3xl md:text-4xl font-bold ${accent}`}>{value}</p>
      <p className="text-sm text-text-secondary mt-1">{label}</p>
    </div>
  );
}

function PainPoint({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red flex items-center justify-center text-sm font-bold">
        {number}
      </span>
      <div>
        <h3 className="text-base font-semibold text-text-primary mb-1">
          {title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-text-secondary">
      <svg
        className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
        />
      </svg>
      {text}
    </li>
  );
}

/* ─── Icons ─── */
const icons = {
  ai: (
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
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  ),
  building: (
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
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0H21"
      />
    </svg>
  ),
  users: (
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  ),
  chart: (
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
  tag: (
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
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  ),
  upload: (
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  ),
  globe: (
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
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  ),
  shield: (
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
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  ),
  play: (
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
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
      />
    </svg>
  ),
  check: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  ),
  whatsapp: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  bell: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  download: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  handshake: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  link: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  userCheck: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
};

/* ─── Main Page ─── */

export default function LandingMarketingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-border-glass">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/redbot-logo-dark background-variant.png"
              alt="Redbot"
              width={120}
              height={34}
              className="h-8 w-auto"
            />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a
              href="#problema"
              className="hover:text-text-primary transition-colors"
            >
              Problema
            </a>
            <a
              href="#solucion"
              className="hover:text-text-primary transition-colors"
            >
              Solución
            </a>
            <a
              href="#funcionalidades"
              className="hover:text-text-primary transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#planes"
              className="hover:text-text-primary transition-colors"
            >
              Planes
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:opacity-90 transition-opacity"
            >
              Prueba gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6">
        {/* Glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-blue/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/8 rounded-full blur-[150px]" />

        <div className="relative max-w-5xl mx-auto text-center">
          <SectionBadge text="Potenciado por Inteligencia Artificial" />

          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight font-[family-name:var(--font-poppins)]">
            <span className="text-text-primary">Multiplica las ventas</span>
            <br />
            <span className="bg-gradient-to-r from-accent-blue via-accent-purple to-accent-cyan bg-clip-text text-transparent">
              de tu inmobiliaria
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Un agente de IA que atiende a tus clientes 24/7, captura leads
            automáticamente y gestiona tu catálogo de propiedades. Todo en un
            solo lugar.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-2xl bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:opacity-90 transition-opacity shadow-lg shadow-accent-purple/20"
            >
              Comenzar gratis — 15 días
            </Link>
            <a
              href="#funcionalidades"
              className="w-full sm:w-auto px-8 py-4 text-base font-medium rounded-2xl border border-border-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-all text-center"
            >
              Ver funcionalidades
            </a>
          </div>

          {/* Floating hero image with animated badges */}
          <div className="relative mt-16 max-w-lg mx-auto">
            {/* Main floating image */}
            <div className="animate-float-main">
              <Image
                src="/marketing/assets/redbot-ecosystem.png"
                alt="Ecosistema Redbot"
                width={500}
                height={500}
                className="w-full h-auto drop-shadow-2xl"
                priority
              />
            </div>

            {/* Floating badge: 24/7 Disponible — top right */}
            <div className="absolute top-8 -right-4 md:top-12 md:-right-16 animate-float-badge-1">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-green/10 backdrop-blur-xl border border-accent-green/20 shadow-lg shadow-accent-green/5">
                <span className="text-sm font-bold text-accent-green">
                  24/7
                </span>
                <span className="text-sm text-text-primary">Disponible</span>
              </div>
            </div>

            {/* Floating badge: +35% Conversión — bottom left */}
            <div className="absolute bottom-16 -left-4 md:bottom-20 md:-left-16 animate-float-badge-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-purple/10 backdrop-blur-xl border border-accent-purple/20 shadow-lg shadow-accent-purple/5">
                <span className="text-sm font-bold text-accent-purple">
                  +35%
                </span>
                <span className="text-sm text-text-primary">Conversión</span>
              </div>
            </div>

            {/* Floating badge: Agente Automatizado — bottom right */}
            <div className="absolute bottom-4 right-0 md:bottom-4 md:-right-12 animate-float-badge-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-blue/10 backdrop-blur-xl border border-accent-blue/20 shadow-lg shadow-accent-blue/5">
                <svg
                  className="w-4 h-4 text-accent-blue"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
                <span className="text-sm text-text-primary">
                  Agente Automatizado
                </span>
              </div>
            </div>

            {/* Floating badge: WhatsApp Integrado — top left */}
            <div className="absolute top-20 -left-4 md:top-24 md:-left-16 animate-float-badge-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-green/10 backdrop-blur-xl border border-accent-green/20 shadow-lg shadow-accent-green/5">
                <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <span className="text-sm text-text-primary">
                  WhatsApp Integrado
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <StatCard
              value="24/7"
              label="Siempre disponible"
              accent="text-accent-green"
            />
            <StatCard
              value="+35%"
              label="Conversión de leads"
              accent="text-accent-blue"
            />
            <StatCard
              value="12"
              label="Tipos de propiedad"
              accent="text-accent-purple"
            />
            <StatCard
              value="18"
              label="Ciudades de Colombia"
              accent="text-accent-cyan"
            />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF — Client Logos ── */}
      <section className="py-12 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-text-muted mb-8">
            Empresas que confían en nosotros — Más de 15 años de experiencia
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-80 transition-opacity">
            {[
              { src: "/marketing/clients/logo-carvajal.png", alt: "Carvajal" },
              { src: "/marketing/clients/logo-sheraton.png", alt: "Sheraton" },
              { src: "/marketing/clients/logo-gogoro.png", alt: "Gogoro" },
              { src: "/marketing/clients/logo-inval.png", alt: "Inval" },
              {
                src: "/marketing/clients/logo-los-olivos.png",
                alt: "Los Olivos",
              },
              {
                src: "/marketing/clients/logo-expreso-palmira.png",
                alt: "Expreso Palmira",
              },
            ].map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={140}
                height={70}
                className="h-14 md:h-16 w-auto object-contain grayscale brightness-200"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section id="problema" className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="El problema" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              ¿Te suena familiar?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <PainPoint
                number="01"
                title="Tu equipo pierde tiempo en mensajes repetitivos"
                description="Más del 80% del tiempo se invierte respondiendo las mismas preguntas mientras los leads calientes se enfrían esperando respuesta."
              />
              <PainPoint
                number="02"
                title="Pagas doble por tus propios leads"
                description="Inviertes en pauta para atraer leads pero luego pagas comisiones a portales inmobiliarios por ese mismo cliente."
              />
              <PainPoint
                number="03"
                title="Estás atrapado en un solo canal"
                description="Tus clientes están en WhatsApp pero tú solo puedes atenderlos en tu web. Cada canal desconectado es un lead perdido."
              />
              <PainPoint
                number="04"
                title="Pierdes compradores reales"
                description="Sin claridad en calificación, tu equipo persigue especuladores mientras compradores reales se van con la competencia."
              />
              <PainPoint
                number="05"
                title="Información dispersa y sin control"
                description="Los datos de clientes, propiedades y conversaciones están en WhatsApp, Excel y correos. No hay una fuente de verdad."
              />
            </div>

            {/* Visual side */}
            <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-red/5 border border-accent-red/10">
                  <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                  <span className="text-sm text-text-secondary">
                    3 leads sin responder hace 4 horas
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-orange/5 border border-accent-orange/10">
                  <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
                  <span className="text-sm text-text-secondary">
                    12 mensajes repetitivos hoy
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-red/5 border border-accent-red/10">
                  <span className="w-2 h-2 rounded-full bg-accent-red" />
                  <span className="text-sm text-text-secondary">
                    2 clientes calientes se fueron con la competencia
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-orange/5 border border-accent-orange/10">
                  <span className="w-2 h-2 rounded-full bg-accent-orange" />
                  <span className="text-sm text-text-secondary">
                    $500 USD en comisiones a portales este mes
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-red/5 border border-accent-red/10">
                  <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                  <span className="text-sm text-text-secondary">
                    47 mensajes de WhatsApp sin responder
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border-glass text-center">
                <p className="text-2xl font-bold text-accent-red">
                  $2,000+ USD/mes
                </p>
                <p className="text-xs text-text-muted mt-1">
                  en oportunidades perdidas y costos innecesarios
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLUTION OVERVIEW ── */}
      <section
        id="solucion"
        className="py-20 md:py-28 px-6 border-t border-border-glass"
      >
        <div className="max-w-5xl mx-auto text-center">
          <SectionBadge text="La solución" />
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
            Conoce Redbot: Real Estate Direct Bot
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            Más que un chatbot: un ecosistema completo que conecta tu IA, tu
            CRM, tu equipo y tus leads en un solo lugar.
          </p>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                title: "Captura en todos los canales",
                desc: "Tu agente IA atiende en tu portal web y WhatsApp simultáneamente. Cada conversación genera un lead automáticamente.",
                accent: "text-accent-blue",
              },
              {
                num: "02",
                title: "Conecta tu catálogo",
                desc: "Importa propiedades desde Excel o crea manualmente. Comparte enlaces directos a cada propiedad con tus clientes.",
                accent: "text-accent-purple",
              },
              {
                num: "03",
                title: "Gestiona tu pipeline",
                desc: "CRM visual con Kanban, calificación automática, etiquetado inteligente y seguimiento de leads por todos los canales.",
                accent: "text-accent-cyan",
              },
              {
                num: "04",
                title: "Crece con tu red",
                desc: "Red de oportunidades entre inmobiliarias, socios de confianza y programa de afiliados para crecer juntos.",
                accent: "text-accent-green",
              },
            ].map((item) => (
              <div
                key={item.num}
                className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-6 text-left hover:border-border-glass-hover transition-all"
              >
                <span
                  className={`text-3xl font-bold ${item.accent} opacity-30`}
                >
                  {item.num}
                </span>
                <h3 className="mt-2 text-base font-semibold text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section
        id="funcionalidades"
        className="py-20 md:py-28 px-6 border-t border-border-glass"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Funcionalidades" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Todo lo que necesitas para vender más
            </h2>
            <p className="mt-4 text-text-secondary max-w-xl mx-auto">
              Cada herramienta diseñada específicamente para el mercado
              inmobiliario colombiano.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Captación */}
            <FeatureCard
              icon={icons.ai}
              title="Agente de IA 24/7"
              description="Responde preguntas sobre tus propiedades, filtra por presupuesto, ubicación, tipo y captura la información del cliente automáticamente."
              accent="bg-accent-blue/10 text-accent-blue"
            />
            <FeatureCard
              icon={icons.whatsapp}
              title="Canal WhatsApp"
              description="Conecta tu WhatsApp Business. Tu agente IA atiende, responde y captura leads 24/7 por WhatsApp. Escanea un QR y listo."
              accent="bg-accent-green/10 text-accent-green"
            />
            <FeatureCard
              icon={icons.globe}
              title="Tu portal web con subdominio"
              description="Tu propia página web pública con catálogo de propiedades, chat IA integrado y enlaces compartibles para cada propiedad."
              accent="bg-accent-blue/10 text-accent-blue"
            />
            <FeatureCard
              icon={icons.bell}
              title="Notificaciones por email"
              description="Alertas automáticas cuando llega un nuevo lead, alguien solicita una propiedad de la red, o hay una acción pendiente."
              accent="bg-accent-orange/10 text-accent-orange"
            />

            {/* Gestión */}
            <FeatureCard
              icon={icons.users}
              title="CRM con pipeline visual"
              description="Tablero Kanban con 8 etapas de venta. Arrastra y suelta leads por el pipeline. Calificación automática por temperatura."
              accent="bg-accent-purple/10 text-accent-purple"
            />
            <FeatureCard
              icon={icons.tag}
              title="Etiquetado automático de leads"
              description="El agente IA clasifica leads por tipo (comprador, inversionista), temperatura (caliente, tibio, frío) y estado financiero."
              accent="bg-accent-orange/10 text-accent-orange"
            />
            <FeatureCard
              icon={icons.chart}
              title="Gestión de equipo"
              description="Roles de administrador y agente, invitaciones por email, control de permisos y seguimiento de actividad del equipo."
              accent="bg-accent-purple/10 text-accent-purple"
            />
            <FeatureCard
              icon={icons.download}
              title="Exportación de leads"
              description="Descarga tus leads en CSV para análisis externo, reportes o integración con otras herramientas de tu inmobiliaria."
              accent="bg-accent-cyan/10 text-accent-cyan"
            />

            {/* Distribución */}
            <FeatureCard
              icon={icons.building}
              title="Catálogo de propiedades"
              description="12 tipos de propiedad, fotos, precios en COP/USD, estratos, áreas, ubicaciones y más. Crea manualmente o importa desde Excel."
              accent="bg-accent-blue/10 text-accent-blue"
            />
            <FeatureCard
              icon={icons.upload}
              title="Importación masiva inteligente"
              description="Sube tu Excel y nuestro sistema mapea columnas automáticamente. Soporta formatos colombianos de precios y detecta duplicados."
              accent="bg-accent-cyan/10 text-accent-cyan"
            />
            <FeatureCard
              icon={icons.handshake}
              title="Red de oportunidades"
              description="Busca propiedades de otras inmobiliarias, solicita compartir y cierra negocios con comisiones acordadas entre agencias."
              accent="bg-accent-green/10 text-accent-green"
            />

            {/* Personalización */}
            <FeatureCard
              icon={icons.shield}
              title="Marca personalizada"
              description="Logo, colores, favicon y nombre personalizado para tu agente IA. Tu identidad visual en cada interacción con tus clientes."
              accent="bg-accent-cyan/10 text-accent-cyan"
            />
            <FeatureCard
              icon={icons.userCheck}
              title="Socios de confianza"
              description="Establece relaciones con otras agencias. Auto-aprueba solicitudes de compartir propiedades y define comisiones por defecto."
              accent="bg-accent-green/10 text-accent-green"
            />
            <FeatureCard
              icon={icons.link}
              title="Dominio personalizado"
              description="Usa tu propio dominio en lugar del subdominio de Redbot. Tu marca, tu URL. Disponible en plan Omni."
              accent="bg-accent-purple/10 text-accent-purple"
            />
            <FeatureCard
              icon={icons.play}
              title="Tutoriales y capacitación"
              description="Biblioteca de video tutoriales integrados para que tu equipo aprenda a usar la plataforma paso a paso."
              accent="bg-accent-green/10 text-accent-green"
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Cómo funciona" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Activa tu agente en 4 pasos
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Configura tu inmobiliaria",
                desc: "Crea tu cuenta, personaliza tu marca (logo, colores) y configura la personalidad de tu agente IA.",
                accent:
                  "from-accent-blue to-accent-blue/50 border-accent-blue/20",
                img: "/marketing/assets/update-your-system.png",
              },
              {
                step: "2",
                title: "Sube tus propiedades",
                desc: "Importa tu catálogo desde Excel o crea propiedades manualmente con fotos, precios y características.",
                accent:
                  "from-accent-purple to-accent-purple/50 border-accent-purple/20",
                img: "/marketing/assets/property.png",
              },
              {
                step: "3",
                title: "Conecta tu WhatsApp",
                desc: "Escanea un código QR y tu agente IA empieza a responder automáticamente por WhatsApp. Sin configuración técnica.",
                accent:
                  "from-accent-cyan to-accent-cyan/50 border-accent-cyan/20",
                img: "/marketing/assets/improve-your-service.png",
              },
              {
                step: "4",
                title: "Tu agente empieza a vender",
                desc: "El agente IA atiende en tu portal web y WhatsApp, responde preguntas, captura leads y los organiza en tu CRM.",
                accent:
                  "from-accent-green to-accent-green/50 border-accent-green/20",
                img: "/marketing/assets/ai-on-your-business.png",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden text-center"
              >
                <div className="aspect-[16/10] relative flex items-center justify-center p-6 pb-0">
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={280}
                    height={200}
                    className="w-auto h-full max-h-[160px] object-contain drop-shadow-lg"
                  />
                </div>
                <div className="p-6 -mt-8 relative">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.accent} border flex items-center justify-center mx-auto mb-4`}
                  >
                    <span className="text-xl font-bold text-white">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTS ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Resultados" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Lo que puedes esperar
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                img: "/marketing/assets/growth-and-money.png",
                title: "Más conversiones, más canales",
                desc: "Incrementa tu conversión atendiendo en web y WhatsApp simultáneamente. Nunca pierdas un lead por no estar disponible.",
              },
              {
                img: "/marketing/assets/goal.png",
                title: "Ahorra hasta $2,000 USD/mes",
                desc: "Reduce costos de portales, comisiones y tiempo perdido en tareas repetitivas.",
              },
              {
                img: "/marketing/assets/ai-on-your-business.png",
                title: "Red de inmobiliarias",
                desc: "Conecta con otras agencias, comparte propiedades y cierra negocios juntos con comisiones acordadas.",
              },
              {
                img: "/marketing/assets/happy-customer.png",
                title: "Leads mejor calificados",
                desc: "El IA clasifica automáticamente por temperatura, tipo e intención de compra.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden hover:border-border-glass-hover transition-all"
              >
                <div className="aspect-[4/3] relative flex items-center justify-center p-6 pb-0">
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={320}
                    height={240}
                    className="w-auto h-full max-h-[200px] object-contain drop-shadow-lg"
                  />
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-base font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section
        id="planes"
        className="py-20 md:py-28 px-6 border-t border-border-glass"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="Planes" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Elige el plan para tu inmobiliaria
            </h2>
            <p className="mt-4 text-text-secondary max-w-xl mx-auto">
              Todos los planes incluyen 15 días de prueba gratis. Sin tarjeta de
              crédito.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-3xl p-7 flex flex-col">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Starter
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Para empezar a automatizar
                </p>
              </div>
              <div className="mt-6">
                <span className="text-4xl font-bold text-text-primary">
                  $89.900
                </span>
                <span className="text-text-muted text-sm"> COP/mes</span>
                <p className="text-xs text-text-muted mt-1">(~$22 USD)</p>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                <CheckItem text="Hasta 50 propiedades" />
                <CheckItem text="2 miembros del equipo" />
                <CheckItem text="100 conversaciones/mes" />
                <CheckItem text="Agente IA básico" />
                <CheckItem text="Portal web con subdominio" />
                <CheckItem text="CRM con pipeline visual" />
                <CheckItem text="Enlaces compartibles" />
                <CheckItem text="Notificaciones por email" />
              </ul>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 px-4 rounded-xl border border-border-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-all font-medium"
              >
                Comenzar gratis
              </Link>
            </div>

            {/* Power — Recommended */}
            <div className="relative bg-bg-glass backdrop-blur-xl border-2 border-accent-blue/40 rounded-3xl p-7 flex flex-col shadow-lg shadow-accent-blue/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-accent-blue text-white">
                  Recomendado
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Power
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Para inmobiliarias en crecimiento
                </p>
              </div>
              <div className="mt-6">
                <span className="text-4xl font-bold text-text-primary">
                  $199.000
                </span>
                <span className="text-text-muted text-sm"> COP/mes</span>
                <p className="text-xs text-text-muted mt-1">(~$50 USD)</p>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                <CheckItem text="Hasta 200 propiedades" />
                <CheckItem text="5 miembros del equipo" />
                <CheckItem text="500 conversaciones/mes" />
                <CheckItem text="Agente IA personalizado" />
                <CheckItem text="Todo lo de Starter +" />
                <CheckItem text="Canal WhatsApp 24/7" />
                <CheckItem text="Red de oportunidades" />
                <CheckItem text="Tags personalizados" />
                <CheckItem text="Exportación de leads" />
                <CheckItem text="Socios de confianza" />
              </ul>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity"
              >
                Comenzar gratis
              </Link>
            </div>

            {/* Omni */}
            <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-3xl p-7 flex flex-col">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Omni
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Para redes inmobiliarias
                </p>
              </div>
              <div className="mt-6">
                <span className="text-4xl font-bold text-text-primary">
                  $399.000
                </span>
                <span className="text-text-muted text-sm"> COP/mes</span>
                <p className="text-xs text-text-muted mt-1">(~$100 USD)</p>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                <CheckItem text="Propiedades ilimitadas" />
                <CheckItem text="Equipo ilimitado" />
                <CheckItem text="2,000 conversaciones/mes" />
                <CheckItem text="Todo lo de Power +" />
                <CheckItem text="Dominio personalizado" />
                <CheckItem text="Soporte prioritario" />
              </ul>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 px-4 rounded-xl border border-border-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-all font-medium"
              >
                Comenzar gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── COLOMBIAN MARKET ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-5xl mx-auto">
          <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <SectionBadge text="Hecho para Colombia 🇨🇴" />
                <h2 className="mt-4 text-2xl md:text-3xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
                  Diseñado para el mercado inmobiliario colombiano
                </h2>
                <p className="mt-4 text-text-secondary leading-relaxed">
                  No es un software genérico adaptado. Redbot fue construido
                  desde cero para las necesidades reales de las inmobiliarias en
                  Colombia.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  "Precios en COP y USD con formatos colombianos",
                  "Sistema de estratos (1-6)",
                  "18 ciudades principales de Colombia",
                  "12 tipos de propiedad del mercado local",
                  "Interfaz completamente en español",
                  "IA entrenada en ventas inmobiliarias colombianas",
                  "Pagos con Mercado Pago en pesos colombianos",
                  "WhatsApp integrado — el canal preferido de los colombianos",
                  "Red de oportunidades entre inmobiliarias colombianas",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <SectionBadge text="FAQ" />
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-text-primary font-[family-name:var(--font-poppins)]">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "¿Necesito conocimientos técnicos para usar Redbot?",
                a: "No. La plataforma está diseñada para que cualquier persona pueda configurar su inmobiliaria en minutos. El proceso de onboarding te guía paso a paso.",
              },
              {
                q: "¿Cómo funciona la prueba gratuita?",
                a: "Tienes 15 días para probar todas las funcionalidades de tu plan sin costo y sin tarjeta de crédito. Si no te convence, simplemente no continúas.",
              },
              {
                q: "¿Puedo importar mis propiedades desde Excel?",
                a: "Sí. Nuestro sistema inteligente detecta automáticamente las columnas de tu archivo y mapea los datos. Soporta formatos colombianos de precios y más de 60 variaciones de nombres de columnas.",
              },
              {
                q: "¿El agente de IA realmente entiende sobre inmobiliaria?",
                a: "Sí. Está potenciado por Claude, uno de los modelos de IA más avanzados del mundo, y entrenado específicamente para responder preguntas sobre propiedades, precios, ubicaciones y capturar información de leads.",
              },
              {
                q: "¿Puedo personalizar la apariencia de mi portal?",
                a: "Sí. Puedes configurar tu logo, colores de marca, favicon y el nombre y personalidad de tu agente IA. Cada inmobiliaria tiene su propia identidad visual.",
              },
              {
                q: "¿Qué pasa con mis datos si cancelo?",
                a: "Tus datos son tuyos. Al cancelar puedes exportar toda tu información de leads y propiedades. No bloqueamos ni eliminamos nada.",
              },
              {
                q: "¿Cómo funciona la integración con WhatsApp?",
                a: "Conectas tu número de WhatsApp escaneando un código QR desde tu panel de administración. Una vez conectado, tu agente IA responde automáticamente a los mensajes. Cada conversación crea un lead en tu CRM. Disponible en plan Power o superior.",
              },
              {
                q: "¿Qué es la red de oportunidades?",
                a: "Es un mercado interno donde las inmobiliarias pueden buscar propiedades de otras agencias, solicitar compartirlas con sus clientes y cerrar negocios con comisiones acordadas. Puedes establecer socios de confianza para agilizar el proceso.",
              },
              {
                q: "¿Cómo funciona el programa de afiliados?",
                a: "Puedes ganar comisiones recurrentes refiriendo nuevas inmobiliarias a Redbot. Recibes un link de referido único y ganas un porcentaje de cada pago mensual de tus referidos mientras estén activos.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-sm font-medium text-text-primary hover:bg-bg-glass-hover transition-colors list-none">
                  {faq.q}
                  <svg
                    className="w-5 h-5 text-text-muted group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-text-secondary leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 md:py-28 px-6 border-t border-border-glass">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-text-primary leading-tight font-[family-name:var(--font-poppins)]">
            ¿Listo para transformar
            <br />
            <span className="bg-gradient-to-r from-accent-blue via-accent-purple to-accent-cyan bg-clip-text text-transparent">
              tu inmobiliaria?
            </span>
          </h2>
          <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto">
            Atiende en WhatsApp y tu portal web 24/7, gestiona leads con IA
            y conecta con una red de inmobiliarias. Todo desde un solo lugar.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 text-base font-semibold rounded-2xl bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:opacity-90 transition-opacity shadow-lg shadow-accent-purple/20"
            >
              Comenzar gratis — 15 días
            </Link>
          </div>

          <p className="mt-6 text-xs text-text-muted">
            Sin tarjeta de crédito. Configura tu inmobiliaria en minutos.
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border-glass py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/redbot-logo-dark background-variant.png"
                alt="Redbot"
                width={100}
                height={28}
                className="h-7 w-auto"
              />
              <span className="text-xs text-text-muted">
                Tu mejor aliado digital para la transformación de tu
                inmobiliaria.
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-text-muted">
              <a
                href="mailto:agencia@theredbot.com"
                className="hover:text-text-primary transition-colors"
              >
                agencia@theredbot.com
              </a>
              <span>Colombia 🇨🇴</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border-glass flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted">
              © {new Date().getFullYear()} Redbot. Todos los derechos
              reservados.
            </p>
            <div className="flex gap-4 text-xs text-text-muted">
              <Link
                href="/login"
                className="hover:text-text-primary transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="hover:text-text-primary transition-colors"
              >
                Crear cuenta
              </Link>
              <Link
                href="/register"
                className="hover:text-text-primary transition-colors"
              >
                Programa de afiliados
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
