import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { TenantAuthBranding } from "@/components/auth/tenant-auth-branding";

export const metadata = {
  title: "Crear cuenta",
};

export default async function RegisterPage() {
  const tenant = await getTenantContext();

  // Block new org registration from tenant subdomains
  if (tenant.isSubdomain) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
            <TenantAuthBranding
              tenant={tenant}
              title={tenant.org.name}
              subtitle="Acceso exclusivo para miembros del equipo"
            />

            <div className="text-center space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-border-glass">
                <p className="text-text-secondary text-sm">
                  Para unirte a <span className="font-medium text-text-primary">{tenant.org.name}</span>, solicita una invitación a tu administrador.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity text-center"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal registration (redbot.app/register)
  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
          <TenantAuthBranding
            tenant={tenant}
            title="Crea tu cuenta"
            subtitle="Comienza a gestionar tus propiedades con IA"
          />

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
