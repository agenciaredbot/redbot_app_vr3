"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GlassBadge } from "@/components/ui/glass-badge";
import { LeadDetailSheet } from "./lead-detail-sheet";
import { PIPELINE_STAGES } from "@/config/constants";
import { formatPrice } from "@/lib/utils/format";
import {
  type LeadFiltersState,
  filtersToParams,
} from "@/lib/types/lead-filters";

interface LeadCard {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  pipeline_stage: string;
  source: string;
  budget: number | null;
  property_summary: string | null;
  created_at: string;
}

interface LeadsByStage {
  [stage: string]: LeadCard[];
}

interface LeadPipelineBoardProps {
  filters: LeadFiltersState;
}

export function LeadPipelineBoard({ filters }: LeadPipelineBoardProps) {
  const [leadsByStage, setLeadsByStage] = useState<LeadsByStage>({});
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<LeadCard | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      // Build params from filters, but exclude stage (board shows all stages as columns)
      const boardFilters = { ...filters, stage: "" };
      const params = filtersToParams(boardFilters, 1, 200);

      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      const leads: LeadCard[] = json.leads || [];

      // Group by stage
      const grouped: LeadsByStage = {};
      for (const stage of PIPELINE_STAGES) {
        grouped[stage.value] = [];
      }
      for (const lead of leads) {
        if (grouped[lead.pipeline_stage]) {
          grouped[lead.pipeline_stage].push(lead);
        } else {
          // Fallback — shouldn't happen
          grouped["nuevo"]?.push(lead);
        }
      }
      setLeadsByStage(grouped);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchLeads]);

  // --- Drag & Drop handlers ---
  const handleDragStart = (e: React.DragEvent, lead: LeadCard) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead.id);
    // Make the dragged element semi-transparent
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => {
      el.style.opacity = "0.4";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedLead || draggedLead.pipeline_stage === targetStage) {
      setDraggedLead(null);
      return;
    }

    // Optimistic update
    setLeadsByStage((prev) => {
      const next = { ...prev };
      // Remove from old stage
      next[draggedLead.pipeline_stage] = next[draggedLead.pipeline_stage].filter(
        (l) => l.id !== draggedLead.id
      );
      // Add to new stage
      const movedLead = { ...draggedLead, pipeline_stage: targetStage };
      next[targetStage] = [movedLead, ...next[targetStage]];
      return next;
    });

    // Persist
    await fetch(`/api/leads/${draggedLead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_stage: targetStage }),
    });

    setDraggedLead(null);
  };

  const totalLeads = Object.values(leadsByStage).reduce(
    (sum, leads) => sum + leads.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Board */}
      <div
        ref={boardRef}
        className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2"
        style={{ minHeight: "calc(100vh - 280px)" }}
      >
        {PIPELINE_STAGES.map((stage) => {
          const leads = leadsByStage[stage.value] || [];
          const isOver = dragOverStage === stage.value;
          const isDragging = !!draggedLead;

          return (
            <div
              key={stage.value}
              className={`
                flex-shrink-0 w-[260px] flex flex-col rounded-xl border transition-colors duration-150
                ${isOver
                  ? "border-accent-blue/50 bg-accent-blue/[0.04]"
                  : "border-border-glass bg-white/[0.02]"
                }
                ${isDragging && !isOver ? "border-border-glass/50" : ""}
              `}
              onDragOver={(e) => handleDragOver(e, stage.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.value)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-glass/50">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-semibold text-text-primary">
                    {stage.label}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                  {leads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-360px)]">
                {leads.length === 0 && (
                  <div
                    className={`
                      text-center py-8 text-[11px] text-text-muted rounded-lg border border-dashed transition-colors
                      ${isOver
                        ? "border-accent-blue/40 text-accent-blue/60"
                        : "border-border-glass/30"
                      }
                    `}
                  >
                    {isOver ? "Soltar aquí" : "Sin leads"}
                  </div>
                )}

                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="
                      group p-3 rounded-lg border border-border-glass bg-white/[0.03]
                      hover:bg-white/[0.06] hover:border-border-glass/80
                      cursor-grab active:cursor-grabbing
                      transition-all duration-100 select-none
                    "
                  >
                    {/* Name */}
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-cyan transition-colors">
                      {lead.full_name}
                    </p>

                    {/* Contact */}
                    <div className="mt-1 space-y-0.5">
                      {lead.email && (
                        <p className="text-[11px] text-text-muted truncate">
                          {lead.email}
                        </p>
                      )}
                      {lead.phone && (
                        <p className="text-[11px] text-text-muted">
                          {lead.phone}
                        </p>
                      )}
                    </div>

                    {/* Budget & Summary */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lead.budget && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                          {formatPrice(lead.budget)}
                        </span>
                      )}
                      {lead.source && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted border border-border-glass/30">
                          {lead.source}
                        </span>
                      )}
                    </div>

                    {/* Property summary preview */}
                    {lead.property_summary && (
                      <p className="mt-1.5 text-[11px] text-text-muted/70 line-clamp-2">
                        {lead.property_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
