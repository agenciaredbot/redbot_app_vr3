import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { TenantAuthBranding } from "@/components/auth/tenant-auth-branding";

export const metadata = {
  title: "Recuperar contraseña",
};

export default async function ForgotPasswordPage() {
  const tenant = await getTenantContext();

  const title = tenant.isSubdomain
    ? `Recuperar contraseña — ${tenant.org.name}`
    : "Recuperar contraseña";

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
          <TenantAuthBranding
            tenant={tenant}
            title={title}
            subtitle="Te enviaremos un enlace para restablecer tu contraseña"
          />

          <ForgotPasswordForm />

          <p className="mt-6 text-center text-sm text-text-muted">
            <Link
              href="/login"
              className="text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
