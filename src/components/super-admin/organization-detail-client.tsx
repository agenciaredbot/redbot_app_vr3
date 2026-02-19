"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface OrgDetail {
  organization: Record<string, unknown>;
  members: Member[];
  stats: {
    properties: number;
    leads: number;
    conversations: number;
    members: number;
  };
}

const roleBadgeStyles: Record<string, string> = {
  super_admin: "bg-accent-orange/15 text-accent-orange border-accent-orange/30",
  org_admin: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
  org_agent: "bg-accent-green/15 text-accent-green border-accent-green/30",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Admin",
  org_agent: "Agente",
};

type Tab = "general" | "members" | "metrics" | "actions";

export function OrganizationDetailClient({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [data, setData] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [planTier, setPlanTier] = useState("");
  const [planStatus, setPlanStatus] = useState("");
  const [maxProperties, setMaxProperties] = useState(0);
  const [maxAgents, setMaxAgents] = useState(0);
  const [maxConversations, setMaxConversations] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const fetchOrg = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        const org = d.organization;
        setPlanTier(org.plan_tier || "basic");
        setPlanStatus(org.plan_status || "trialing");
        setMaxProperties(org.max_properties || 0);
        setMaxAgents(org.max_agents || 0);
        setMaxConversations(org.max_conversations_per_month || 0);
        setIsActive(org.is_active !== false);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_tier: planTier,
          plan_status: planStatus,
          max_properties: maxProperties,
          max_agents: maxAgents,
          max_conversations_per_month: maxConversations,
          is_active: isActive,
        }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Cambios guardados" });
        fetchOrg();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error al guardar" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    const orgName = (data.organization as { name: string }).name;
    if (deleteConfirm !== orgName) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/super-admin/organizations");
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error al eliminar" });
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-muted">Cargando...</p>
      </div>
    );
  }

  const org = data.organization as Record<string, string | number | boolean | null>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "members", label: `Miembros (${data.stats.members})` },
    { id: "metrics", label: "Metricas" },
    { id: "actions", label: "Acciones" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/super-admin/organizations"
          className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-2 inline-block"
        >
          &larr; Volver a organizaciones
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{org.name as string}</h1>
          {!isActive && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent-red/15 text-accent-red border border-accent-red/30">
              Inactiva
            </span>
          )}
        </div>
        <p className="text-text-secondary mt-1 font-mono text-sm">{org.slug as string}</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-sm mb-4 ${
            feedback.type === "success"
              ? "bg-accent-green/10 border border-accent-green/20 text-accent-green"
              : "bg-accent-red/10 border border-accent-red/20 text-accent-red"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg-glass backdrop-blur-xl border border-border-glass rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-accent-blue/10 text-accent-blue"
                : "text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-6">
        {activeTab === "general" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow label="Nombre" value={org.name as string} />
            <InfoRow label="Slug" value={org.slug as string} mono />
            <InfoRow label="Email" value={(org.email as string) || "—"} />
            <InfoRow label="Telefono" value={(org.phone as string) || "—"} />
            <InfoRow label="Ciudad" value={(org.city as string) || "—"} />
            <InfoRow label="Plan" value={org.plan_tier as string} />
            <InfoRow label="Estado del plan" value={org.plan_status as string} />
            <InfoRow
              label="Creado"
              value={new Date(org.created_at as string).toLocaleDateString("es-CO", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
            <InfoRow label="Onboarding completo" value={org.onboarding_completed ? "Si" : "No"} />
            <InfoRow label="Tema" value={(org.theme_mode as string) || "dark"} />
          </div>
        )}

        {activeTab === "members" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-glass">
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Nombre</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Email</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Rol</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Estado</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Creado</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id} className="border-b border-border-glass/50">
                    <td className="px-3 py-2.5 text-sm text-text-primary">{m.full_name}</td>
                    <td className="px-3 py-2.5 text-sm text-text-secondary">{m.email}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${roleBadgeStyles[m.role] || ""}`}>
                        {roleLabels[m.role] || m.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${
                        m.is_active
                          ? "bg-accent-green/15 text-accent-green border-accent-green/30"
                          : "bg-accent-red/15 text-accent-red border-accent-red/30"
                      }`}>
                        {m.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-text-muted">
                      {new Date(m.created_at).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox label="Miembros" value={data.stats.members} color="text-accent-blue" />
            <MetricBox label="Propiedades" value={data.stats.properties} color="text-accent-cyan" />
            <MetricBox label="Leads" value={data.stats.leads} color="text-accent-orange" />
            <MetricBox label="Conversaciones" value={data.stats.conversations} color="text-accent-purple" />
            <MetricBox label="Max Propiedades" value={maxProperties} color="text-text-secondary" />
            <MetricBox label="Max Agentes" value={maxAgents} color="text-text-secondary" />
            <MetricBox label="Max Conversaciones/mes" value={maxConversations} color="text-text-secondary" />
            <MetricBox
              label="Conversaciones usadas"
              value={org.conversations_used_this_month as number || 0}
              color="text-text-secondary"
            />
          </div>
        )}

        {activeTab === "actions" && (
          <div className="space-y-8">
            {/* Edit Plan */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Editar plan y limites</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Plan</label>
                  <select
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                  >
                    <option value="basic">Basic</option>
                    <option value="power">Power</option>
                    <option value="omni">Omni</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Estado</label>
                  <select
                    value={planStatus}
                    onChange={(e) => setPlanStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                  >
                    <option value="trialing">Trial</option>
                    <option value="active">Activo</option>
                    <option value="past_due">Vencido</option>
                    <option value="canceled">Cancelado</option>
                    <option value="unpaid">Sin pago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Max propiedades</label>
                  <input
                    type="number"
                    value={maxProperties}
                    onChange={(e) => setMaxProperties(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Max agentes</label>
                  <input
                    type="number"
                    value={maxAgents}
                    onChange={(e) => setMaxAgents(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Max conversaciones/mes</label>
                  <input
                    type="number"
                    value={maxConversations}
                    onChange={(e) => setMaxConversations(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-border-glass accent-accent-blue"
                    />
                    <span className="text-sm text-text-primary">Organizacion activa</span>
                  </label>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-border-glass pt-8">
              <h3 className="text-lg font-semibold text-accent-red mb-2">Zona peligrosa</h3>
              <p className="text-sm text-text-muted mb-4">
                Eliminar esta organizacion borrara permanentemente todos sus datos: usuarios, propiedades, leads, conversaciones y mensajes. Esta accion no se puede deshacer.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-sm">
                  <label className="block text-sm text-text-secondary mb-1">
                    Escribe &quot;{(org.name as string)}&quot; para confirmar
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={(org.name as string)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-accent-red/30 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-red/50"
                  />
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirm !== (org.name as string) || deleting}
                  className="px-6 py-2.5 rounded-xl bg-accent-red text-white text-sm font-medium hover:bg-accent-red/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {deleting ? "Eliminando..." : "Eliminar organizacion"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-text-primary ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/[0.03] border border-border-glass/50 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString("es-CO")}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}
