"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LeadTable } from "./lead-table";
import { LeadPipelineBoard } from "./lead-pipeline-board";
import { LeadFilters } from "./lead-filters";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";
import { PIPELINE_STAGES } from "@/config/constants";
import {
  type LeadFiltersState,
  EMPTY_FILTERS,
} from "@/lib/types/lead-filters";

type ViewMode = "pipeline" | "table";

export function LeadsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("pipeline");
  const [filters, setFilters] = useState<LeadFiltersState>(EMPTY_FILTERS);

  // Deep-link: read ?lead=<id> from URL to auto-open a specific lead
  const [initialLeadId] = useState(() => searchParams.get("lead"));

  // Clean the query param from the URL after reading it
  useEffect(() => {
    if (initialLeadId) {
      const url = new URL(window.location.href);
      url.searchParams.delete("lead");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltersChange = (newFilters: LeadFiltersState) => {
    setFilters(newFilters);
  };

  return (
    <div>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-border-glass">
          <button
            onClick={() => setView("pipeline")}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${view === "pipeline"
                ? "bg-white/[0.1] text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            {/* Kanban icon */}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Pipeline
          </button>
          <button
            onClick={() => setView("table")}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${view === "table"
                ? "bg-white/[0.1] text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            {/* Table icon */}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Tabla
          </button>
        </div>
      </div>

      {/* Shared toolbar: search + stage filter */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex-1 min-w-[200px]">
          <GlassInput
            variant="search"
            placeholder="Buscar leads..."
            defaultValue={filters.search}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                handleFiltersChange({
                  ...filters,
                  search: (e.target as HTMLInputElement).value,
                });
              }
            }}
          />
        </div>
        {/* Stage filter only in table view (board shows all stages as columns) */}
        {view === "table" && (
          <div className="w-48">
            <GlassSelect
              options={PIPELINE_STAGES}
              placeholder="Todas las etapas"
              value={filters.stage}
              onChange={(e) =>
                handleFiltersChange({ ...filters, stage: e.target.value })
              }
            />
          </div>
        )}
      </div>

      {/* Advanced filters */}
      <LeadFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Content */}
      {view === "pipeline" ? (
        <LeadPipelineBoard filters={filters} initialLeadId={initialLeadId} />
      ) : (
        <LeadTable filters={filters} initialLeadId={initialLeadId} />
      )}
    </div>
  );
}
