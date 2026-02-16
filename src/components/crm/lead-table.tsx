"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";
import { LeadDetailSheet } from "./lead-detail-sheet";
import { PIPELINE_STAGES } from "@/config/constants";
import { formatDate, formatPipelineStage } from "@/lib/utils/format";

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  pipeline_stage: string;
  source: string;
  notes: string | null;
  created_at: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

export function LeadTable() {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (stageFilter) params.set("stage", stageFilter);

    try {
      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStageChange = async (leadId: string, newStage: string) => {
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_stage: newStage }),
    });
    fetchLeads();
  };

  const stageColor = (stage: string) =>
    PIPELINE_STAGES.find((s) => s.value === stage)?.color || "#6B7280";

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px]">
          <GlassInput
            variant="search"
            placeholder="Buscar leads..."
            defaultValue={search}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                setSearch((e.target as HTMLInputElement).value);
                setPage(1);
              }
            }}
          />
        </div>
        <div className="w-48">
          <GlassSelect
            options={PIPELINE_STAGES}
            placeholder="Todas las etapas"
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <GlassCard padding="none">
        {loading && !data ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !data?.leads.length ? (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-text-secondary">No hay leads registrados</p>
            <p className="text-text-muted text-sm mt-1">
              Los leads aparecerán aquí cuando los visitantes interactúen con el chat AI
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-glass">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Contacto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Etapa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Fuente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-glass">
                  {data.leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">
                          {lead.full_name}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-text-secondary">
                          {lead.email && <p>{lead.email}</p>}
                          {lead.phone && (
                            <p className="text-text-muted">{lead.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.pipeline_stage}
                          onChange={(e) =>
                            handleStageChange(lead.id, e.target.value)
                          }
                          className="text-xs px-2 py-1 rounded-lg bg-transparent border border-border-glass text-text-primary focus:outline-none"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option
                              key={s.value}
                              value={s.value}
                              className="bg-bg-secondary"
                            >
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <GlassBadge color="#6B7280">{lead.source}</GlassBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-muted">
                          {formatDate(lead.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                          className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-glass">
                <p className="text-sm text-text-muted">
                  {data.total} leads — Página {data.page} de {data.totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </GlassButton>
                  )}
                  {page < data.totalPages && (
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                    >
                      Siguiente
                    </GlassButton>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* Detail sheet */}
      {selectedLeadId && (
        <LeadDetailSheet
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={fetchLeads}
        />
      )}
    </>
  );
}
