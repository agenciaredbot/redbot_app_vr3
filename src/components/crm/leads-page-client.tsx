"use client";

import { useState } from "react";
import { LeadTable } from "./lead-table";
import { LeadPipelineBoard } from "./lead-pipeline-board";

type ViewMode = "pipeline" | "table";

export function LeadsPageClient() {
  const [view, setView] = useState<ViewMode>("pipeline");

  return (
    <div>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Content */}
      {view === "pipeline" ? <LeadPipelineBoard /> : <LeadTable />}
    </div>
  );
}
