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
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Redbot
            </h1>
            <p className="text-text-secondary text-lg">
              Tu agente inmobiliario AI, siempre disponible.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-green" />
              Next.js 16 + React 19 + TypeScript
            </div>
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-blue" />
              Tailwind CSS 4 + Glassmorphism
            </div>
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-purple" />
              Supabase + Anthropic Claude AI
            </div>
            <div className="flex items-center gap-3 text-text-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-accent-cyan" />
              Multi-tenant SaaS Architecture
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border-glass">
            <p className="text-text-muted text-xs">
              Phase 1 Complete — Scaffold Ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
