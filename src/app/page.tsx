import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-bg-primary" />
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-accent-purple/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-accent-blue/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-accent-cyan/5 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        {/* Glass card */}
        <div className="relative overflow-hidden bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-12 max-w-lg w-full text-center transition-all duration-300 hover:bg-bg-glass-hover hover:border-border-glass-hover hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)]">
          <div className="mb-8">
            <Image
              src="/redbot-logo-dark-background.png"
              alt="Redbot"
              width={280}
              height={78}
              className="mx-auto mb-6"
              priority
            />
            <p className="text-text-secondary text-lg">
              Tu agente inmobiliario AI, siempre disponible.
            </p>
          </div>

          <div className="space-y-3 text-left mb-8">
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-green shrink-0" />
              Agente de IA que responde 24/7 por tus clientes
            </div>
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-blue shrink-0" />
              Catálogo de propiedades con búsqueda inteligente
            </div>
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-purple shrink-0" />
              CRM integrado para gestionar tus leads
            </div>
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-cyan shrink-0" />
              Tu propia página web inmobiliaria con subdominio
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/register"
              className="block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity text-center"
            >
              Comenzar gratis
            </Link>
            <Link
              href="/login"
              className="block w-full py-3 px-4 rounded-xl border border-border-glass text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-all text-center"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/landing-marketing"
              className="block w-full py-3 px-4 rounded-xl text-text-muted hover:text-accent-cyan transition-colors text-center text-sm"
            >
              Más información
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-border-glass">
            <p className="text-text-muted text-xs">
              Potenciado por inteligencia artificial — Hecho en Colombia 🇨🇴
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
