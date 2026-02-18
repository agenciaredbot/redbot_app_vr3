"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";
import {
  TIMELINE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  TAG_CATEGORY_LABELS,
} from "@/config/constants";
import type { LeadFiltersState } from "@/lib/types/lead-filters";
import { countActiveFilters } from "@/lib/types/lead-filters";

interface TagData {
  id: string;
  value: string;
  color: string;
  category: string;
}

interface LeadFiltersProps {
  filters: LeadFiltersState;
  onFiltersChange: (filters: LeadFiltersState) => void;
}

export function LeadFilters({ filters, onFiltersChange }: LeadFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagData[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags || []))
      .catch(() => {});
  }, []);

  const activeCount = countActiveFilters(filters);

  // Group tags by category
  const tagsByCategory = allTags.reduce(
    (acc, tag) => {
      const cat = tag.category || "custom";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tag);
      return acc;
    },
    {} as Record<string, TagData[]>
  );

  // Preserve category order from TAG_CATEGORY_LABELS
  const orderedCategories = Object.keys(TAG_CATEGORY_LABELS).filter(
    (cat) => tagsByCategory[cat] && tagsByCategory[cat].length > 0
  );

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter((t) => t !== tagId)
      : [...filters.tags, tagId];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const updateFilter = (
    key: keyof LeadFiltersState,
    value: string
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAdvancedFilters = () => {
    onFiltersChange({
      ...filters,
      tags: [],
      source: "",
      budgetMin: "",
      budgetMax: "",
      timeline: "",
      preferredZones: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <div className="mb-4">
      {/* Toggle row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
          Filtros avanzados
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-accent-blue/20 text-accent-blue font-medium">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAdvancedFilters}
            className="text-[11px] text-accent-red/70 hover:text-accent-red transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Collapsible panel */}
      {isOpen && (
        <GlassCard className="mt-3" padding="md">
          <div className="space-y-4">
            {/* Tags section */}
            {orderedCategories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">
                  Tags
                </p>
                <div className="space-y-2.5">
                  {orderedCategories.map((category) => {
                    const tags = tagsByCategory[category];
                    const selectedInCategory = tags.filter((t) =>
                      filters.tags.includes(t.id)
                    ).length;

                    return (
                      <div key={category}>
                        <p className="text-[11px] text-text-muted mb-1">
                          {TAG_CATEGORY_LABELS[category] || category}
                          {selectedInCategory > 0 && (
                            <span className="ml-1 text-accent-blue">
                              ({selectedInCategory})
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => {
                            const isSelected = filters.tags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-150 ${
                                  isSelected
                                    ? "font-medium"
                                    : "text-text-muted hover:bg-white/[0.06]"
                                }`}
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: `${tag.color}20`,
                                        color: tag.color,
                                        borderColor: `${tag.color}40`,
                                      }
                                    : { borderColor: `${tag.color}30` }
                                }
                              >
                                {tag.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row: Source + Timeline dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassSelect
                label="Fuente"
                options={LEAD_SOURCE_OPTIONS}
                placeholder="Todas las fuentes"
                value={filters.source}
                onChange={(e) => updateFilter("source", e.target.value)}
              />
              <GlassSelect
                label="Urgencia"
                options={TIMELINE_OPTIONS}
                placeholder="Todas"
                value={filters.timeline}
                onChange={(e) => updateFilter("timeline", e.target.value)}
              />
            </div>

            {/* Row: Budget range */}
            <div className="grid grid-cols-2 gap-3">
              <GlassInput
                label="Presupuesto mín (COP)"
                type="number"
                placeholder="Ej: 100000000"
                value={filters.budgetMin}
                onChange={(e) =>
                  updateFilter(
                    "budgetMin",
                    (e.target as HTMLInputElement).value
                  )
                }
              />
              <GlassInput
                label="Presupuesto máx (COP)"
                type="number"
                placeholder="Ej: 500000000"
                value={filters.budgetMax}
                onChange={(e) =>
                  updateFilter(
                    "budgetMax",
                    (e.target as HTMLInputElement).value
                  )
                }
              />
            </div>

            {/* Row: Preferred zones */}
            <GlassInput
              label="Zonas de preferencia"
              placeholder="Ej: Chapinero, Usaquén..."
              value={filters.preferredZones}
              onChange={(e) =>
                updateFilter(
                  "preferredZones",
                  (e.target as HTMLInputElement).value
                )
              }
            />

            {/* Row: Date range */}
            <div className="grid grid-cols-2 gap-3">
              <GlassInput
                label="Desde"
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  updateFilter(
                    "dateFrom",
                    (e.target as HTMLInputElement).value
                  )
                }
              />
              <GlassInput
                label="Hasta"
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  updateFilter(
                    "dateTo",
                    (e.target as HTMLInputElement).value
                  )
                }
              />
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
