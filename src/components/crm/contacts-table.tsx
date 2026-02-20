"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { LeadDetailSheet } from "./lead-detail-sheet";
import { LeadFilters } from "./lead-filters";
import { PIPELINE_STAGES, TIMELINE_OPTIONS } from "@/config/constants";
import { leadCreateSchema, type LeadCreateInput } from "@/lib/validators/lead";
import { formatDate, formatPipelineStage, formatPrice } from "@/lib/utils/format";
import {
  type LeadFiltersState,
  EMPTY_FILTERS,
  filtersToParams,
} from "@/lib/types/lead-filters";
import { useFeatureGate } from "@/hooks/use-feature-gate";

interface Contact {
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
}

interface ContactsResponse {
  leads: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

export function ContactsTable() {
  const [data, setData] = useState<ContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LeadFiltersState>(EMPTY_FILTERS);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feature gating
  const { canFeature, getFeatureInfo } = useFeatureGate();
  const canExport = canFeature("exportLeads");
  const exportInfo = getFeatureInfo("exportLeads");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = filtersToParams(filters, page, 25);

    try {
      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchContacts]);

  const handleFiltersChange = (newFilters: LeadFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  };

  // --- Add Contact Form ---
  const FORM_TIMELINE_OPTIONS = [
    { value: "", label: "Sin definir" },
    ...TIMELINE_OPTIONS,
  ];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadCreateInput>({
    resolver: zodResolver(leadCreateSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      pipeline_stage: "nuevo",
      source: "manual",
      budget: "",
      property_summary: "",
      preferred_zones: "",
      timeline: "",
      notes: "",
    },
  });

  const onAddContact = async (formData: LeadCreateInput) => {
    setAddError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const json = await res.json();
        setAddError(json.error || "Error al crear el contacto");
        return;
      }

      setShowAddDialog(false);
      reset();
      setPage(1);
      fetchContacts();
    } catch {
      setAddError("Error de conexión");
    }
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setAddError(null);
    reset();
  };

  // --- Export ---
  const handleExport = async (format: "csv" | "xlsx") => {
    setExporting(true);
    try {
      // Fetch all matching leads (respecting active filters)
      const exportParams = filtersToParams(filters, 1, 1000);
      const res = await fetch(`/api/leads?${exportParams}`);
      const json = await res.json();
      const leads: Contact[] = json.leads || [];

      if (leads.length === 0) {
        setExporting(false);
        return;
      }

      if (format === "csv") {
        exportCSV(leads);
      } else {
        await exportXLSX(leads);
      }
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = (leads: Contact[]) => {
    const headers = [
      "Nombre",
      "Email",
      "Teléfono",
      "Etapa",
      "Fuente",
      "Presupuesto",
      "Qué busca",
      "Zonas",
      "Urgencia",
      "Notas",
      "Fecha",
    ];

    const rows = leads.map((l) => [
      l.full_name || "",
      l.email || "",
      l.phone || "",
      formatPipelineStage(l.pipeline_stage),
      l.source || "",
      l.budget ? String(l.budget) : "",
      l.property_summary || "",
      l.preferred_zones || "",
      l.timeline || "",
      (l.notes || "").replace(/[\n\r]/g, " "),
      formatDate(l.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, `contactos-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportXLSX = async (leads: Contact[]) => {
    // Dynamic import to avoid loading xlsx unless needed
    const XLSX = await import("xlsx");

    const wsData = [
      [
        "Nombre",
        "Email",
        "Teléfono",
        "Etapa",
        "Fuente",
        "Presupuesto",
        "Qué busca",
        "Zonas",
        "Urgencia",
        "Notas",
        "Fecha",
      ],
      ...leads.map((l) => [
        l.full_name || "",
        l.email || "",
        l.phone || "",
        formatPipelineStage(l.pipeline_stage),
        l.source || "",
        l.budget || "",
        l.property_summary || "",
        l.preferred_zones || "",
        l.timeline || "",
        l.notes || "",
        formatDate(l.created_at),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 25 }, // Nombre
      { wch: 30 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 15 }, // Etapa
      { wch: 12 }, // Fuente
      { wch: 18 }, // Presupuesto
      { wch: 40 }, // Qué busca
      { wch: 25 }, // Zonas
      { wch: 12 }, // Urgencia
      { wch: 40 }, // Notas
      { wch: 12 }, // Fecha
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Contactos");
    XLSX.writeFile(
      wb,
      `contactos-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stageColor = (stage: string) =>
    PIPELINE_STAGES.find((s) => s.value === stage)?.color || "#6B7280";

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex-1 min-w-[200px]">
          <GlassInput
            variant="search"
            placeholder="Buscar por nombre, email o teléfono..."
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
        <div className="w-48">
          <GlassSelect
            options={PIPELINE_STAGES}
            placeholder="Todas las etapas"
            value={filters.stage}
            onChange={(e) => {
              handleFiltersChange({ ...filters, stage: e.target.value });
            }}
          />
        </div>

        {/* Add contact + Export buttons */}
        <div className="flex items-center gap-2">
          <GlassButton
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar
            </span>
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exporting || !canExport}
            title={!canExport ? exportInfo.message : undefined}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
              {!canExport && <span className="text-[10px] opacity-60">PRO</span>}
            </span>
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => handleExport("xlsx")}
            disabled={exporting || !canExport}
            loading={exporting}
            title={!canExport ? exportInfo.message : undefined}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel
              {!canExport && <span className="text-[10px] opacity-60">PRO</span>}
            </span>
          </GlassButton>
        </div>
      </div>

      {/* Advanced filters */}
      <LeadFilters filters={filters} onFiltersChange={handleFiltersChange} />

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
            <p className="text-text-secondary">No hay contactos registrados</p>
            <p className="text-text-muted text-sm mt-1">
              Los contactos aparecerán aquí cuando se registren leads
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
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Etapa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Presupuesto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Qué busca
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Zonas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Urgencia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-glass">
                  {data.leads.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedLeadId(contact.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-accent-cyan hover:underline">
                          {contact.full_name}
                        </p>
                        {contact.source && (
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {contact.source}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {contact.email || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {contact.phone || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <GlassBadge color={stageColor(contact.pipeline_stage)}>
                          {formatPipelineStage(contact.pipeline_stage)}
                        </GlassBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {contact.budget
                            ? formatPrice(contact.budget)
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-text-muted truncate">
                          {contact.property_summary || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-muted">
                          {contact.preferred_zones || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-muted capitalize">
                          {contact.timeline || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-muted whitespace-nowrap">
                          {formatDate(contact.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination + count */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-glass">
              <p className="text-sm text-text-muted">
                {data.total} contacto{data.total !== 1 ? "s" : ""}{" "}
                {data.totalPages > 1 && (
                  <>— Página {data.page} de {data.totalPages}</>
                )}
              </p>
              {data.totalPages > 1 && (
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
              )}
            </div>
          </>
        )}
      </GlassCard>

      {/* Detail sheet */}
      {selectedLeadId && (
        <LeadDetailSheet
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={fetchContacts}
        />
      )}

      {/* Add contact dialog */}
      <GlassDialog
        open={showAddDialog}
        onClose={handleCloseAddDialog}
        title="Agregar contacto"
        description="Registra un nuevo contacto manualmente"
        className="max-w-2xl"
        actions={
          <>
            <GlassButton variant="secondary" onClick={handleCloseAddDialog}>
              Cancelar
            </GlassButton>
            <GlassButton
              onClick={handleSubmit(onAddContact)}
              loading={isSubmitting}
            >
              Guardar contacto
            </GlassButton>
          </>
        }
      >
        <form onSubmit={handleSubmit(onAddContact)} className="space-y-4">
          {addError && (
            <div className="px-3 py-2 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">
              {addError}
            </div>
          )}

          {/* Row 1: Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassInput
              label="Nombre completo *"
              placeholder="Juan Pérez"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <GlassInput
              label="Teléfono"
              placeholder="+57 300 123 4567"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>

          {/* Row 2: Email + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassInput
              label="Email"
              type="email"
              placeholder="juan@ejemplo.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <GlassInput
              label="Fuente"
              placeholder="manual, referido, evento..."
              error={errors.source?.message}
              {...register("source")}
            />
          </div>

          {/* Row 3: Stage + Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassSelect
              label="Etapa del pipeline"
              options={PIPELINE_STAGES}
              error={errors.pipeline_stage?.message}
              {...register("pipeline_stage")}
            />
            <GlassInput
              label="Presupuesto (COP)"
              type="number"
              placeholder="350000000"
              error={errors.budget?.message}
              {...register("budget")}
            />
          </div>

          {/* Row 4: Property Summary */}
          <GlassInput
            label="Qué busca"
            placeholder="Apartamento 3 habitaciones, mínimo 80m², con parqueadero..."
            error={errors.property_summary?.message}
            {...register("property_summary")}
          />

          {/* Row 5: Zones + Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassInput
              label="Zonas de preferencia"
              placeholder="Chapinero, Usaquén, Cedritos..."
              error={errors.preferred_zones?.message}
              {...register("preferred_zones")}
            />
            <GlassSelect
              label="Urgencia"
              options={FORM_TIMELINE_OPTIONS}
              error={errors.timeline?.message}
              {...register("timeline")}
            />
          </div>

          {/* Row 6: Notes */}
          <GlassTextarea
            label="Notas"
            placeholder="Información adicional sobre este contacto..."
            error={errors.notes?.message}
            {...register("notes")}
          />
        </form>
      </GlassDialog>
    </>
  );
}
