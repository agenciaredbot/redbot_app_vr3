"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSelect } from "@/components/ui/glass-select";
import { PIPELINE_STAGES } from "@/config/constants";
import { formatDateTime, formatPrice } from "@/lib/utils/format";
import { useFeatureGate } from "@/hooks/use-feature-gate";

interface TagData {
  id: string;
  value: string;
  color: string;
  category: string;
}

interface LeadDetail {
  lead: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    pipeline_stage: string;
    source: string;
    notes: string | null;
    budget: number | null;
    property_summary: string | null;
    preferred_zones: string | null;
    timeline: string | null;
    created_at: string;
  };
  tags: TagData[];
}

interface LeadDetailSheetProps {
  leadId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  tipo: "Tipo",
  fuente: "Fuente",
  temperatura: "Temperatura",
  razon_salida: "Razón de salida",
  propiedad: "Propiedad",
  financiero: "Financiero",
  reactivacion: "Reactivación",
  custom: "Personalizados",
};

export function LeadDetailSheet({
  leadId,
  onClose,
  onUpdate,
}: LeadDetailSheetProps) {
  const [data, setData] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const { canFeature } = useFeatureGate();
  const canCreateTags = canFeature("customTags");

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      setData(json);
      setNotes(json.lead?.notes || "");
    } catch {
      // silent
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const json = await res.json();
      setAllTags(json.tags || []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchDetail(), fetchTags()]);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const handleStageChange = async (newStage: string) => {
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_stage: newStage }),
    });
    onUpdate();
    await fetchDetail();
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

  const handleAddTag = async (tagId: string) => {
    await fetch(`/api/leads/${leadId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: tagId }),
    });
    await fetchDetail();
    onUpdate();
  };

  const handleRemoveTag = async (tagId: string) => {
    await fetch(`/api/leads/${leadId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: tagId }),
    });
    await fetchDetail();
    onUpdate();
  };

  const handleCreateCustomTag = async () => {
    if (!newTagValue.trim()) return;
    setCreatingTag(true);

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: newTagValue.trim().toLowerCase().replace(/\s+/g, "-"),
        category: "custom",
      }),
    });

    if (res.ok) {
      const { tag } = await res.json();
      await handleAddTag(tag.id);
      setNewTagValue("");
      await fetchTags();
    }

    setCreatingTag(false);
  };

  // Tags available to add (exclude already-assigned)
  const currentTagIds = new Set(data?.tags.map((t) => t.id) || []);
  const availableTags = allTags.filter((t) => !currentTagIds.has(t.id));
  const tagsByCategory = availableTags.reduce(
    (acc, tag) => {
      const cat = tag.category || "custom";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tag);
      return acc;
    },
    {} as Record<string, TagData[]>
  );

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
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
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
                    <svg
                      className="w-4 h-4 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {data.lead.email}
                  </div>
                )}
                {data.lead.phone && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <svg
                      className="w-4 h-4 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {data.lead.phone}
                  </div>
                )}
                {data.lead.source && (
                  <div className="flex items-center gap-2 text-text-muted text-xs">
                    Fuente: {data.lead.source}
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

            {/* Search profile */}
            {(data.lead.budget || data.lead.property_summary || data.lead.preferred_zones || data.lead.timeline) && (
              <GlassCard>
                <h4 className="text-sm font-medium text-text-secondary mb-3">
                  Perfil de búsqueda
                </h4>
                <div className="space-y-2.5 text-sm">
                  {data.lead.budget && (
                    <div>
                      <span className="text-text-muted text-xs">Presupuesto</span>
                      <p className="text-text-primary font-medium">
                        {formatPrice(data.lead.budget)}
                      </p>
                    </div>
                  )}
                  {data.lead.property_summary && (
                    <div>
                      <span className="text-text-muted text-xs">Qué busca</span>
                      <p className="text-text-secondary">
                        {data.lead.property_summary}
                      </p>
                    </div>
                  )}
                  {data.lead.preferred_zones && (
                    <div>
                      <span className="text-text-muted text-xs">Zonas de interés</span>
                      <p className="text-text-secondary">
                        {data.lead.preferred_zones}
                      </p>
                    </div>
                  )}
                  {data.lead.timeline && (
                    <div>
                      <span className="text-text-muted text-xs">Urgencia</span>
                      <p className="text-text-secondary capitalize">
                        {data.lead.timeline}
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Tags */}
            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-text-secondary">
                  Tags
                </h4>
                <button
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  {showTagPicker ? "Cerrar" : "+ Agregar"}
                </button>
              </div>

              {/* Current tags */}
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <GlassBadge key={tag.id} color={tag.color}>
                    <span className="flex items-center gap-1">
                      {tag.value}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity text-xs leading-none"
                        aria-label={`Quitar tag ${tag.value}`}
                      >
                        ×
                      </button>
                    </span>
                  </GlassBadge>
                ))}
                {data.tags.length === 0 && !showTagPicker && (
                  <p className="text-xs text-text-muted">
                    Sin tags asignados
                  </p>
                )}
              </div>

              {/* Tag picker */}
              {showTagPicker && (
                <div className="mt-3 border-t border-border-glass pt-3 space-y-3">
                  {Object.entries(tagsByCategory).map(([category, tags]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-text-muted mb-1.5">
                        {CATEGORY_LABELS[category] || category}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => handleAddTag(tag.id)}
                            className="px-2 py-0.5 text-xs rounded-full border border-border-glass text-text-secondary hover:bg-white/[0.08] hover:text-text-primary transition-colors"
                            style={{ borderColor: tag.color + "40" }}
                          >
                            {tag.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {availableTags.length === 0 && (
                    <p className="text-xs text-text-muted">
                      Todos los tags ya están asignados
                    </p>
                  )}

                  {/* Create custom tag */}
                  {canCreateTags ? (
                    <div className="border-t border-border-glass pt-3">
                      <p className="text-xs font-medium text-text-muted mb-1.5">
                        Crear tag personalizado
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nuevo tag..."
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleCreateCustomTag()
                          }
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
                        />
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={handleCreateCustomTag}
                          disabled={!newTagValue.trim() || creatingTag}
                          loading={creatingTag}
                        >
                          Crear
                        </GlassButton>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border-glass pt-3">
                      <p className="text-[11px] text-amber-400/80">
                        Tags personalizados disponibles desde el plan Power.{" "}
                        <a href="/admin/billing" className="underline hover:text-amber-300">Actualizar plan</a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>

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
                <GlassButton
                  size="sm"
                  onClick={handleSaveNotes}
                  loading={saving}
                >
                  Guardar notas
                </GlassButton>
              </div>
            </GlassCard>
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
