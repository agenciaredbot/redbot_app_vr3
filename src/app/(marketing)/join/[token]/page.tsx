import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { JoinForm } from "@/components/auth/join-form";
import { GlassCard } from "@/components/ui/glass-card";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { TenantAuthBranding } from "@/components/auth/tenant-auth-branding";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const tenant = await getTenantContext();

  // Validate invitation using admin client (public page, no auth)
  const supabase = createAdminClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, role, status, expires_at, organization_id")
    .eq("token", token)
    .single();

  // Check if invitation is valid
  const isInvalid =
    !invitation ||
    invitation.status !== "pending" ||
    new Date(invitation.expires_at) < new Date();

  if (isInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center">
          <TenantAuthBranding
            tenant={tenant}
            title="Invitación no válida"
            subtitle={
              !invitation
                ? "Esta invitación no existe o ha sido eliminada."
                : invitation.status !== "pending"
                ? "Esta invitación ya fue utilizada."
                : "Esta invitación ha expirado."
            }
          />
          <Link
            href="/login"
            className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
          >
            Ir a iniciar sesión
          </Link>
        </GlassCard>
      </div>
    );
  }

  // Get organization name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .single();

  const orgName = org?.name || "Organización";
  const roleLabel = invitation.role === "org_admin" ? "Administrador" : "Agente";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full">
        {tenant.isSubdomain && (
          <TenantAuthBranding
            tenant={tenant}
            title={`Únete a ${orgName}`}
            subtitle={`Has sido invitado como ${roleLabel}. Crea tu cuenta para acceder al equipo.`}
          />
        )}
        <JoinForm
          token={token}
          organizationName={orgName}
          role={invitation.role}
          showHeader={!tenant.isSubdomain}
        />
      </GlassCard>
    </div>
  );
}
