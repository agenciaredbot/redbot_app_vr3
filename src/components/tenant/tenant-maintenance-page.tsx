import Link from "next/link";
import Image from "next/image";

interface TenantMaintenancePageProps {
  orgName: string;
}

export function TenantMaintenancePage({ orgName }: TenantMaintenancePageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center space-y-8">
        {/* Logo */}
        <Link href="https://redbot.app" className="inline-block">
          <Image
            src="/redbot-logo-dark background-variant.png"
            alt="Redbot"
            width={160}
            height={45}
            className="h-10 w-auto mx-auto"
          />
        </Link>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-white/[0.03] border border-border-glass rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17l-5.5-3.18a2.25 2.25 0 010-3.89l5.5-3.18a2.25 2.25 0 012.16 0l5.5 3.18a2.25 2.25 0 010 3.89l-5.5 3.18a2.25 2.25 0 01-2.16 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 12v9"
            />
          </svg>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-text-primary">
            Sitio en mantenimiento
          </h1>
          <p className="text-text-secondary leading-relaxed">
            El portal de <strong className="text-text-primary">{orgName}</strong> se
            encuentra temporalmente fuera de servicio.
          </p>
        </div>

        {/* Admin note */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-border-glass">
          <p className="text-sm text-text-muted">
            Si eres el administrador de este sitio,{" "}
            <Link
              href="/login"
              className="text-accent-blue hover:underline"
            >
              inicia sesion
            </Link>{" "}
            para reactivar tu cuenta.
          </p>
        </div>

        {/* Back to Redbot */}
        <Link
          href="https://redbot.app"
          className="inline-block text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          ← Volver a redbot.app
        </Link>
      </div>
    </div>
  );
}
