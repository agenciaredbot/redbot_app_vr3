"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSelect } from "@/components/ui/glass-select";
import { PIPELINE_STAGES } from "@/config/constants";
import { formatDateTime, formatPipelineStage } from "@/lib/utils/format";

interface LeadDetail {
  lead: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    pipeline_stage: string;
    source: string;
    notes: string | null;
    created_at: string;
  };
  messages: { role: string; content: string; created_at: string }[] | null;
  tags: { id: string; name: string; color: string; category: string }[];
}

interface LeadDetailSheetProps {
  leadId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadDetailSheet({
  leadId,
  onClose,
  onUpdate,
}: LeadDetailSheetProps) {
  const [data, setData] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        const json = await res.json();
        setData(json);
        setNotes(json.lead?.notes || "");
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [leadId]);

  const handleStageChange = async (newStage: string) => {
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_stage: newStage }),
    });
    onUpdate();
    // Refresh detail
    const res = await fetch(`/api/leads/${leadId}`);
    setData(await res.json());
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    onUpdate();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-bg-primary border-l border-border-glass overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-bg-primary/90 border-b border-border-glass px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Detalle del lead
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05] text-text-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="p-6 space-y-6">
            {/* Contact info */}
            <GlassCard>
              <h3 className="text-xl font-bold text-text-primary mb-3">
                {data.lead.full_name}
              </h3>
              <div className="space-y-2 text-sm">
                {data.lead.email && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {data.lead.email}
                  </div>
                )}
                {data.lead.phone && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {data.lead.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-text-muted text-xs">
                  Creado: {formatDateTime(data.lead.created_at)}
                </div>
              </div>
            </GlassCard>

            {/* Pipeline stage */}
            <GlassCard>
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Etapa del pipeline
              </h4>
              <GlassSelect
                options={PIPELINE_STAGES}
                value={data.lead.pipeline_stage}
                onChange={(e) => handleStageChange(e.target.value)}
              />
            </GlassCard>

            {/* Tags */}
            {data.tags.length > 0 && (
              <GlassCard>
                <h4 className="text-sm font-medium text-text-secondary mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.tags.map((tag) => (
                    <GlassBadge key={tag.id} color={tag.color}>
                      {tag.name}
                    </GlassBadge>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Notes */}
            <GlassCard>
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Notas
              </h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega notas sobre este lead..."
                className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-border-glass text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50 min-h-[80px] resize-y"
              />
              <div className="mt-2 flex justify-end">
                <GlassButton size="sm" onClick={handleSaveNotes} loading={saving}>
                  Guardar notas
                </GlassButton>
              </div>
            </GlassCard>

            {/* Chat history */}
            {data.messages && data.messages.length > 0 && (
              <GlassCard>
                <h4 className="text-sm font-medium text-text-secondary mb-3">
                  Historial de conversación
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-accent-blue/10 text-text-primary ml-4"
                          : "bg-white/[0.03] text-text-secondary mr-4"
                      }`}
                    >
                      <span className="font-medium text-text-muted">
                        {msg.role === "user" ? "Visitante" : "Agente"}:
                      </span>{" "}
                      {msg.content}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-text-secondary">
            Error cargando el lead
          </div>
        )}
      </div>
    </>
  );
}
