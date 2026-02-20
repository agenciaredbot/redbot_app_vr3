import Image from "next/image";
import type { TenantContext } from "@/lib/tenant/get-tenant-context";

interface TenantAuthBrandingProps {
  tenant: TenantContext;
  title: string;
  subtitle?: string;
}

/**
 * Server component that shows tenant branding (logo + name) on auth pages
 * when accessed via a tenant subdomain, or the default Redbot branding otherwise.
 */
export function TenantAuthBranding({ tenant, title, subtitle }: TenantAuthBrandingProps) {
  if (tenant.isSubdomain && tenant.org) {
    return (
      <div className="text-center mb-8">
        {tenant.org.logo_url ? (
          <img
            src={tenant.org.logo_url}
            alt={tenant.org.name}
            className="mx-auto mb-4 max-h-14 w-auto object-contain"
          />
        ) : (
          <div className="mx-auto mb-4 h-14 flex items-center justify-center">
            <span className="text-2xl font-bold text-text-primary">
              {tenant.org.name}
            </span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-text-secondary mt-1">{subtitle}</p>
        )}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <span>Powered by</span>
          <Image
            src="/redbot-logo-dark-background.png"
            alt="Redbot"
            width={60}
            height={17}
            className="opacity-60"
          />
        </div>
      </div>
    );
  }

  // Default Redbot branding (no subdomain)
  return (
    <div className="text-center mb-8">
      <Image
        src="/redbot-logo-dark-background.png"
        alt="Redbot"
        width={180}
        height={50}
        className="mx-auto mb-4"
      />
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      {subtitle && (
        <p className="text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}
