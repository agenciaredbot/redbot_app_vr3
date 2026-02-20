import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { TenantAuthBranding } from "@/components/auth/tenant-auth-branding";

export const metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const errorParam = params.error;
  const messageParam = params.message;
  const tenant = await getTenantContext();

  const errorMessages: Record<string, string> = {
    auth_callback_failed: "No pudimos verificar tu cuenta. Intenta iniciar sesión o reenviar el correo de verificación.",
    email_not_confirmed: "Tu email aún no ha sido confirmado. Revisa tu correo.",
  };

  const successMessages: Record<string, string> = {
    email_confirmed: "¡Tu email ha sido verificado! Ya puedes iniciar sesión.",
  };

  const errorText = errorParam ? (errorMessages[errorParam] || decodeURIComponent(errorParam)) : null;
  const successText = messageParam ? (successMessages[messageParam] || decodeURIComponent(messageParam)) : null;

  const title = tenant.isSubdomain
    ? `Inicia sesión en ${tenant.org.name}`
    : "Bienvenido de vuelta";
  const subtitle = tenant.isSubdomain
    ? undefined
    : "Ingresa a tu panel de administración";

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
          <TenantAuthBranding tenant={tenant} title={title} subtitle={subtitle} />

          {errorText && (
            <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm mb-4">
              {errorText}
            </div>
          )}

          {successText && (
            <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm mb-4">
              {successText}
            </div>
          )}

          <LoginForm />

          {!tenant.isSubdomain && (
            <p className="mt-6 text-center text-sm text-text-muted">
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="text-accent-blue hover:text-accent-blue/80 transition-colors"
              >
                Regístrate gratis
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
