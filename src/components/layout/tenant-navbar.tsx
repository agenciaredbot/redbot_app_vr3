import Link from "next/link";
import Image from "next/image";

interface TenantNavbarProps {
  orgName: string;
  logoUrl: string | null;
}

export function TenantNavbar({ orgName, logoUrl }: TenantNavbarProps) {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-bg-glass border-b border-border-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={orgName}
                className="h-8 w-auto rounded-lg"
              />
            ) : (
              <Image
                src="/redbot-favicon-96x96.png"
                alt="Redbot"
                width={32}
                height={32}
                className="rounded-lg"
              />
            )}
            <span className="text-lg font-semibold text-text-primary">
              {orgName}
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/propiedades"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Propiedades
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
