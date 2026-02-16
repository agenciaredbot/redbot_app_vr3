import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";

export const metadata = {
  title: "Configuración",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let org = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.organization_id) {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();
      org = data;
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>

      {/* Organization info */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Organización
        </h2>
        {org ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Nombre</p>
                <p className="text-text-primary font-medium">{org.name}</p>
              </div>
              <div>
                <p className="text-text-muted">Slug / URL</p>
                <p className="text-text-primary font-medium">
                  {org.slug}.redbot.app
                </p>
              </div>
              <div>
                <p className="text-text-muted">Ciudad</p>
                <p className="text-text-primary">{org.city || "-"}</p>
              </div>
              <div>
                <p className="text-text-muted">Email</p>
                <p className="text-text-primary">{org.email || "-"}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <GlassBadge color="#3B82F6">
                Plan: {org.plan_tier}
              </GlassBadge>
              <GlassBadge
                color={org.plan_status === "active" ? "#10B981" : "#F59E0B"}
              >
                {org.plan_status}
              </GlassBadge>
            </div>
          </div>
        ) : (
          <p className="text-text-secondary">No se encontró la organización.</p>
        )}
      </GlassCard>

      {/* AI Agent */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Agente AI
        </h2>
        {org ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-muted">Nombre del agente</p>
              <p className="text-text-primary font-medium">
                {org.agent_name}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Personalidad</p>
              <p className="text-text-secondary">
                {org.agent_personality || "Configuración por defecto"}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Idioma</p>
              <p className="text-text-primary">{org.agent_language}</p>
            </div>
          </div>
        ) : null}
      </GlassCard>

      {/* Limits */}
      {org && (
        <GlassCard>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Uso y límites
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Propiedades máximas</p>
              <p className="text-text-primary font-medium">
                {org.max_properties}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Conversaciones/mes</p>
              <p className="text-text-primary font-medium">
                {org.conversations_used_this_month} /{" "}
                {org.max_conversations_per_month}
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
