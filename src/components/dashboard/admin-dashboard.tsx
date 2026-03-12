"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  GlassDonutChart,
  GlassBarChart,
  GlassHBarChart,
  GlassProgressBar,
  MiniStat,
} from "./dashboard-charts";
import { formatPropertyType, formatPrice } from "@/lib/utils/format";

// ── Types ─────────────────────────────────────────────────
export interface DashboardData {
  // KPIs
  totalProperties: number;
  publishedProperties: number;
  soldProperties: number;
  rentedProperties: number;
  reservedProperties: number;
  availableProperties: number;
  featuredProperties: number;
  totalViews: number;
  totalLeads: number;
  newLeads: number;
  activeConversations: number;
  closedConversations: number;
  totalConversations: number;
  totalMessages: number;

  // Breakdowns
  propertiesByType: Array<{ name: string; value: number }>;
  propertiesByBusiness: Array<{ name: string; value: number }>;
  leadsByStage: Array<{ name: string; value: number; color: string }>;
  conversationsByChannel: Array<{ name: string; value: number }>;
  recentLeads: Array<{
    id: string;
    full_name: string;
    pipeline_stage: string;
    created_at: string;
  }>;
  topProperties: Array<{
    id: string;
    title: string;
    city: string | null;
    property_type: string;
    views_count: number;
  }>;

  // Team
  agents: Array<{
    id: string;
    full_name: string;
    last_login_at: string | null;
    properties_count: number;
    leads_count: number;
  }>;
  pendingInvitations: number;

  // Plan usage
  conversationsUsed: number;
  conversationsMax: number;

  // WhatsApp
  whatsappStatus: string | null; // "connected" | "disconnected" | null
  whatsappConversations: number;

  // Conversion
  closedLeads: number;
  lostLeads: number;
}

// ── Section IDs ───────────────────────────────────────────
const SECTIONS = [
  { id: "properties", label: "🏠 Propiedades", icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" },
  { id: "leads", label: "🎯 Leads & Pipeline", icon: "M15 19.128a9.38 9.38 0 002.625.372" },
  { id: "conversations", label: "💬 Conversaciones", icon: "M8.625 12a.375.375 0 11-.75 0" },
  { id: "team", label: "👥 Equipo", icon: "M18 18.72a9.094 9.094 0 003.741-.479" },
  { id: "whatsapp", label: "📱 WhatsApp", icon: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25" },
  { id: "topViewed", label: "👁 Más visitadas", icon: "M2.036 12.322a1.012 1.012 0 010-.639" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ── Pipeline stage labels/colors ──────────────────────────
const STAGE_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  visita_tour: "Visita/Tour",
  oferta: "Oferta",
  bajo_contrato: "Bajo contrato",
  cerrado: "Cerrado",
  perdido: "Perdido",
};

// ── Component ─────────────────────────────────────────────
export function AdminDashboard({ data }: { data: DashboardData }) {
  const [visible, setVisible] = useState<Set<SectionId>>(
    new Set(SECTIONS.map((s) => s.id))
  );

  const toggle = (id: SectionId) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const conversionRate =
    data.totalLeads > 0
      ? ((data.closedLeads / data.totalLeads) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* ── Title ──────────────────────────────── */}
      <h1 className="text-2xl font-bold text-text-primary">
        Panel de administración
      </h1>

      {/* ── KPI Row ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MiniStat label="Propiedades" value={data.totalProperties} icon="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" color="#3B82F6" />
        <MiniStat label="Publicadas" value={data.publishedProperties} icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="#10B981" />
        <MiniStat label="Vendidas" value={data.soldProperties} icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="#F59E0B" />
        <MiniStat label="Arrendadas" value={data.rentedProperties} icon="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" color="#8B5CF6" />
        <MiniStat label="Total leads" value={data.totalLeads} icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952" color="#EC4899" />
        <MiniStat label="Leads nuevos" value={data.newLeads} icon="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" color="#06B6D4" />
        <MiniStat label="Conversaciones" value={data.activeConversations} icon="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" color="#3B82F6" />
        <MiniStat label="Vistas totales" value={data.totalViews.toLocaleString()} icon="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" color="#F59E0B" />
      </div>

      {/* ── Section Toggles ────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
              visible.has(s.id)
                ? "bg-accent-blue/20 border-accent-blue/40 text-text-primary"
                : "bg-bg-glass border-border-glass text-text-muted hover:text-text-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Properties Section ─────────────────── */}
      {visible.has("properties") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            🏠 Propiedades
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard padding="md">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Por disponibilidad
              </h3>
              <GlassDonutChart
                data={[
                  { name: "Disponible", value: data.availableProperties },
                  { name: "Vendido", value: data.soldProperties },
                  { name: "Arrendado", value: data.rentedProperties },
                  { name: "Reservado", value: data.reservedProperties },
                ]}
              />
            </GlassCard>

            <GlassCard padding="md">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Por tipo de inmueble
              </h3>
              <GlassBarChart data={data.propertiesByType} color="#8B5CF6" />
            </GlassCard>

            <GlassCard padding="md">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Por tipo de negocio
              </h3>
              <GlassBarChart data={data.propertiesByBusiness} color="#06B6D4" />
            </GlassCard>
          </div>
        </div>
      )}

      {/* ── Leads Section ──────────────────────── */}
      {visible.has("leads") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            🎯 Leads & Pipeline
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard padding="md">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Pipeline de ventas
              </h3>
              <GlassHBarChart data={data.leadsByStage} />
            </GlassCard>

            <div className="space-y-4">
              <GlassCard padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Tasa de conversión</p>
                    <p className="text-3xl font-bold text-text-primary">
                      {conversionRate}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">
                      {data.closedLeads} cerrados / {data.totalLeads} total
                    </p>
                    <p className="text-xs text-text-muted">
                      {data.lostLeads} perdidos
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard padding="md">
                <h3 className="text-sm font-medium text-text-secondary mb-3">
                  Últimos leads
                </h3>
                {data.recentLeads.length === 0 ? (
                  <p className="text-text-muted text-sm">Sin leads aún</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between py-2 border-b border-border-glass last:border-0"
                      >
                        <div>
                          <p className="text-sm text-text-primary font-medium">
                            {lead.full_name || "Sin nombre"}
                          </p>
                          <p className="text-xs text-text-muted">
                            {new Date(lead.created_at).toLocaleDateString("es-CO")}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-lg bg-accent-purple/10 text-accent-purple">
                          {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {/* ── Conversations Section ──────────────── */}
      {visible.has("conversations") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            💬 Conversaciones
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard padding="md">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-accent-green">
                    {data.activeConversations}
                  </p>
                  <p className="text-xs text-text-muted">Activas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-secondary">
                    {data.closedConversations}
                  </p>
                  <p className="text-xs text-text-muted">Cerradas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent-blue">
                    {data.totalMessages.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">Mensajes</p>
                </div>
              </div>
              <div className="mt-4">
                <GlassProgressBar
                  value={data.conversationsUsed}
                  max={data.conversationsMax}
                  label="Uso del plan"
                />
              </div>
            </GlassCard>

            <GlassCard padding="md">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Por canal
              </h3>
              <GlassDonutChart data={data.conversationsByChannel} height={200} />
            </GlassCard>

            <GlassCard padding="md">
              <h3 className="text-sm font-medium text-text-secondary mb-3">
                Resumen
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Total conversaciones</span>
                  <span className="text-sm font-semibold text-text-primary">{data.totalConversations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Promedio mensajes/conv</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {data.totalConversations > 0
                      ? Math.round(data.totalMessages / data.totalConversations)
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">WhatsApp</span>
                  <span className="text-sm font-semibold text-text-primary">{data.whatsappConversations}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ── Team Section ───────────────────────── */}
      {visible.has("team") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            👥 Equipo
          </h2>
          <GlassCard padding="md">
            {data.pendingInvitations > 0 && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-sm">
                {data.pendingInvitations} invitación(es) pendiente(s)
              </div>
            )}
            {data.agents.length === 0 ? (
              <p className="text-text-muted text-sm">Sin agentes</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase border-b border-border-glass">
                      <th className="text-left py-2 font-medium">Agente</th>
                      <th className="text-center py-2 font-medium">Propiedades</th>
                      <th className="text-center py-2 font-medium">Leads</th>
                      <th className="text-right py-2 font-medium">Último acceso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agents.map((agent) => (
                      <tr
                        key={agent.id}
                        className="border-b border-border-glass/50 last:border-0"
                      >
                        <td className="py-3 text-text-primary font-medium">
                          {agent.full_name || "Sin nombre"}
                        </td>
                        <td className="py-3 text-center text-text-secondary">
                          {agent.properties_count}
                        </td>
                        <td className="py-3 text-center text-text-secondary">
                          {agent.leads_count}
                        </td>
                        <td className="py-3 text-right text-text-muted text-xs">
                          {agent.last_login_at
                            ? new Date(agent.last_login_at).toLocaleDateString("es-CO", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Nunca"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── WhatsApp Section ───────────────────── */}
      {visible.has("whatsapp") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            📱 WhatsApp
          </h2>
          <GlassCard padding="md">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  data.whatsappStatus === "connected"
                    ? "bg-accent-green animate-pulse"
                    : "bg-text-muted"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {data.whatsappStatus === "connected"
                    ? "Conectado"
                    : data.whatsappStatus === null
                      ? "No configurado"
                      : "Desconectado"}
                </p>
                <p className="text-xs text-text-muted">
                  {data.whatsappConversations} conversaciones por WhatsApp
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Top Viewed Properties ──────────────── */}
      {visible.has("topViewed") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            👁 Propiedades más visitadas
          </h2>
          <GlassCard padding="md">
            {data.topProperties.length === 0 ? (
              <p className="text-text-muted text-sm">Sin datos de visitas</p>
            ) : (
              <div className="space-y-3">
                {data.topProperties.map((prop, i) => {
                  const maxViews = data.topProperties[0]?.views_count || 1;
                  const pct = (prop.views_count / maxViews) * 100;
                  return (
                    <div key={prop.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-text-muted w-5 flex-shrink-0">
                            #{i + 1}
                          </span>
                          <span className="text-sm text-text-primary truncate">
                            {prop.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className="text-xs text-text-muted">
                            {prop.city || ""} · {formatPropertyType(prop.property_type)}
                          </span>
                          <span className="text-sm font-semibold text-accent-blue min-w-[50px] text-right">
                            {prop.views_count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-bg-glass ml-5">
                        <div
                          className="h-full rounded-full bg-accent-blue/60 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
