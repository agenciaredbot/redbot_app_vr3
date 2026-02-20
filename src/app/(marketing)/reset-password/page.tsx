import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { TenantAuthBranding } from "@/components/auth/tenant-auth-branding";

export const metadata = {
  title: "Nueva contraseña",
};

export default async function ResetPasswordPage() {
  const tenant = await getTenantContext();

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
          <TenantAuthBranding
            tenant={tenant}
            title="Nueva contraseña"
            subtitle="Ingresa tu nueva contraseña"
          />

          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
