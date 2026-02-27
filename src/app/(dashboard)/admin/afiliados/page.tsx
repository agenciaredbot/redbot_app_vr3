import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AffiliateDashboard } from "@/components/affiliates/affiliate-dashboard";
import { AffiliateActivationCta } from "@/components/affiliates/affiliate-activation-cta";

export default async function AfiliadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Check if user has an affiliate record
  const adminClient = createAdminClient();
  const { data: affiliate } = await adminClient
    .from("affiliates")
    .select("id, status")
    .eq("user_id", user.id)
    .single();

  const isAffiliate = !!affiliate;
  const isActive = affiliate?.status === "active";
  const isPending = affiliate?.status === "pending";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Programa de Afiliados</h1>
        <p className="text-text-muted text-sm mt-1">
          {isActive
            ? "Gestiona tus referidos y ganancias"
            : "Gana comisiones recurrentes refiriendo nuevos clientes"}
        </p>
      </div>

      {isActive ? (
        <AffiliateDashboard />
      ) : isPending ? (
        <div className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">
            <svg className="w-16 h-16 mx-auto text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Solicitud en Revisión</h2>
          <p className="text-text-muted max-w-md mx-auto">
            Tu solicitud de afiliado está siendo revisada por nuestro equipo.
            Te notificaremos cuando sea aprobada.
          </p>
        </div>
      ) : (
        <AffiliateActivationCta
          userRole={profile.role}
          hasOrg={!!profile.organization_id}
        />
      )}
    </div>
  );
}
