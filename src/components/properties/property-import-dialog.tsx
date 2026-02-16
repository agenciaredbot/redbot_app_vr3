"use client";

import { useState, useCallback, useRef } from "react";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  generateImportPreview,
  MAPPABLE_FIELDS,
  type ImportPreview,
  type PropertyInsertData,
} from "@/lib/utils/property-import";

interface ImportResult {
  success: boolean;
  imported: number;
  total: number;
  errors: { row: number; errors: string[] }[];
}

interface PropertyImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStep = "upload" | "preview" | "importing" | "results";

export function PropertyImportDialog({
  open,
  onClose,
  onSuccess,
}: PropertyImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      setParseError("Formato no soportado. Usa Excel (.xlsx/.xls) o CSV.");
      return;
    }
    setParseError(null);
    setFile(f);
    setResult(null);
    setManualOverrides({});

    // Parse client-side immediately
    try {
      const buffer = await f.arrayBuffer();
      setFileBuffer(buffer);
      const previewData = generateImportPreview(buffer);

      if (previewData.totalRows === 0) {
        setParseError("El archivo está vacío o no tiene datos.");
        return;
      }
      if (previewData.totalRows > 500) {
        setParseError("Máximo 500 propiedades por importación.");
        return;
      }

      setPreview(previewData);
      setStep("preview");
    } catch {
      setParseError("Error leyendo el archivo. Verifica que sea un Excel válido.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleManualOverride = useCallback(
    (header: string, field: string) => {
      const newOverrides = { ...manualOverrides, [header]: field };
      setManualOverrides(newOverrides);

      // Re-generate preview with overrides
      if (fileBuffer) {
        const previewData = generateImportPreview(fileBuffer, newOverrides);
        setPreview(previewData);
      }
    },
    [manualOverrides, fileBuffer]
  );

  const handleImport = async () => {
    if (!preview) return;

    const validProperties = preview.rows
      .filter((r) => r.property)
      .map((r) => r.property as PropertyInsertData);

    if (validProperties.length === 0) return;

    setStep("importing");
    setLoading(true);

    try {
      const response = await fetch("/api/properties/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: validProperties }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          imported: 0,
          total: validProperties.length,
          errors: [{ row: 0, errors: [data.error] }],
        });
      } else {
        setResult(data);
        if (data.imported > 0) {
          onSuccess();
        }
      }
    } catch {
      setResult({
        success: false,
        imported: 0,
        total: validProperties.length,
        errors: [{ row: 0, errors: ["Error de conexión"] }],
      });
    } finally {
      setLoading(false);
      setStep("results");
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setFileBuffer(null);
    setPreview(null);
    setManualOverrides({});
    setResult(null);
    setParseError(null);
    onClose();
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setFileBuffer(null);
    setPreview(null);
    setManualOverrides({});
    setResult(null);
    setParseError(null);
  };

  const dialogWidth = step === "preview" ? "max-w-4xl" : "max-w-lg";

  return (
    <GlassDialog
      open={open}
      onClose={handleClose}
      title="Importar propiedades"
      className={dialogWidth}
    >
      <div className="space-y-4">
        {/* ─── Step 1: Upload ─── */}
        {step === "upload" && (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${
                  dragOver
                    ? "border-accent-blue bg-accent-blue/5"
                    : "border-border-glass hover:border-border-glass-hover"
                }
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <svg
                className="w-10 h-10 mx-auto mb-3 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-text-secondary text-sm">
                Arrastra un archivo o haz clic para seleccionar
              </p>
              <p className="text-text-muted text-xs mt-1">
                Excel (.xlsx, .xls) o CSV — Máx. 500 propiedades
              </p>
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
                {parseError}
              </div>
            )}

            {/* Template download + format guide */}
            <div className="flex items-center justify-between text-xs text-text-muted">
              <a
                href="/import-template.xlsx"
                download
                className="hover:text-accent-blue transition-colors underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Descargar plantilla Excel
              </a>
              <details>
                <summary className="cursor-pointer hover:text-text-secondary">
                  Columnas soportadas
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-right">
                  <span>Título / Nombre</span>
                  <span>Tipo (Apartamento, Casa...)</span>
                  <span>Negocio (Venta, Arriendo)</span>
                  <span>Precio Venta / Arriendo</span>
                  <span>Ciudad, Departamento</span>
                  <span>Zona / Barrio</span>
                  <span>Habitaciones, Baños</span>
                  <span>Área construida</span>
                  <span>Estrato</span>
                  <span>Código / Referencia</span>
                </div>
              </details>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <GlassButton variant="secondary" onClick={handleClose}>
                Cancelar
              </GlassButton>
            </div>
          </>
        )}

        {/* ─── Step 2: Preview ─── */}
        {step === "preview" && preview && (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                {preview.totalRows} propiedades
              </span>
              {preview.validCount > 0 && (
                <span className="px-3 py-1 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green">
                  {preview.validCount} válidas
                </span>
              )}
              {preview.errorCount > 0 && (
                <span className="px-3 py-1 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red">
                  {preview.errorCount} con errores
                </span>
              )}
              {preview.duplicateCount > 0 && (
                <span className="px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                  {preview.duplicateCount} duplicados
                </span>
              )}
              {preview.availableSheets.length > 1 && (
                <span className="px-3 py-1 rounded-lg bg-bg-glass border border-border-glass text-text-muted">
                  Hoja: {preview.sheetName}
                </span>
              )}
            </div>

            {/* Column Mappings */}
            <GlassCard padding="sm">
              <h3 className="text-sm font-medium text-text-primary mb-2">
                Columnas detectadas
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {preview.columnMappings.map((m) => (
                  <div
                    key={m.rawHeader}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        m.confidence === "exact"
                          ? "bg-accent-green"
                          : m.confidence === "contains"
                          ? "bg-yellow-500"
                          : "bg-orange-500"
                      }`}
                    />
                    <span className="text-text-muted truncate min-w-0">
                      {m.rawHeader}
                    </span>
                    <svg
                      className="w-3 h-3 text-text-muted shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-text-secondary font-medium">
                      {MAPPABLE_FIELDS.find((f) => f.value === m.mappedField)
                        ?.label || m.mappedField}
                    </span>
                  </div>
                ))}

                {/* Unmapped headers with manual override */}
                {preview.unmappedHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-text-muted" />
                    <span className="text-text-muted truncate min-w-0">
                      {header}
                    </span>
                    <svg
                      className="w-3 h-3 text-text-muted shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <select
                      className="bg-bg-glass border border-border-glass rounded-md px-1.5 py-0.5 text-xs text-text-secondary focus:outline-none focus:border-accent-blue"
                      value={manualOverrides[header] || ""}
                      onChange={(e) =>
                        handleManualOverride(header, e.target.value)
                      }
                    >
                      <option value="">Ignorar</option>
                      {MAPPABLE_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Data Preview Table */}
            {preview.sampleData.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border-glass">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-bg-glass/50">
                      <th className="px-3 py-2 text-left text-text-muted font-medium">
                        Título
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-medium">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-medium">
                        Negocio
                      </th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">
                        Precio
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-medium">
                        Ciudad
                      </th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">
                        Área
                      </th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">
                        Hab
                      </th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">
                        Baños
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleData.map((row, i) => {
                      const hasError = "_error" in row;
                      return (
                        <tr
                          key={i}
                          className={`border-t border-border-glass ${
                            hasError ? "bg-accent-red/5" : ""
                          }`}
                        >
                          <td className="px-3 py-1.5 text-text-primary truncate max-w-[200px]">
                            {String(row.titulo)}
                          </td>
                          <td className="px-3 py-1.5 text-text-secondary">
                            {String(row.tipo)}
                          </td>
                          <td className="px-3 py-1.5 text-text-secondary">
                            {String(row.negocio)}
                          </td>
                          <td className="px-3 py-1.5 text-text-secondary text-right tabular-nums">
                            {Number(row.precio) > 0
                              ? Number(row.precio).toLocaleString("es-CO")
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-text-secondary">
                            {String(row.ciudad)}
                          </td>
                          <td className="px-3 py-1.5 text-text-secondary text-right tabular-nums">
                            {row.area !== "—" ? `${row.area} m²` : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-text-secondary text-right">
                            {String(row.hab)}
                          </td>
                          <td className="px-3 py-1.5 text-text-secondary text-right">
                            {String(row.banos)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {preview.totalRows > 5 && (
                  <div className="px-3 py-1.5 text-xs text-text-muted text-center border-t border-border-glass bg-bg-glass/30">
                    Mostrando 5 de {preview.totalRows} propiedades
                  </div>
                )}
              </div>
            )}

            {/* Errors preview */}
            {preview.errorCount > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-accent-red">
                  {preview.errorCount} fila(s) con errores (no se importarán):
                </p>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {preview.rows
                    .filter((r) => r.errors.length > 0)
                    .slice(0, 10)
                    .map((r, i) => (
                      <div
                        key={i}
                        className="text-xs text-text-muted bg-bg-glass rounded px-2 py-1"
                      >
                        Fila {r.rowNumber}: {r.errors.join(", ")}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-between pt-2">
              <GlassButton variant="secondary" onClick={handleReset}>
                Volver
              </GlassButton>
              <GlassButton
                onClick={handleImport}
                disabled={preview.validCount === 0}
              >
                Importar {preview.validCount} propiedad
                {preview.validCount !== 1 ? "es" : ""}
              </GlassButton>
            </div>
          </>
        )}

        {/* ─── Step: Importing ─── */}
        {step === "importing" && (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              Importando {preview?.validCount} propiedades...
            </p>
          </div>
        )}

        {/* ─── Step 3: Results ─── */}
        {step === "results" && result && (
          <>
            <div className="space-y-3">
              {result.imported > 0 && (
                <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20">
                  <p className="text-sm text-accent-green flex items-center gap-2">
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {result.imported} propiedad(es) importada(s) de{" "}
                    {result.total}
                  </p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-accent-red">
                    {result.errors.length} error(es):
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <div
                        key={i}
                        className="text-xs text-text-secondary bg-bg-glass rounded-lg px-3 py-1.5"
                      >
                        {err.row > 0 ? `Fila ${err.row}: ` : ""}
                        {err.errors.join(", ")}
                      </div>
                    ))}
                    {result.errors.length > 20 && (
                      <p className="text-xs text-text-muted">
                        ...y {result.errors.length - 20} errores más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-between pt-2">
              <GlassButton variant="secondary" onClick={handleReset}>
                Importar otro archivo
              </GlassButton>
              <GlassButton onClick={handleClose}>Cerrar</GlassButton>
            </div>
          </>
        )}
      </div>
    </GlassDialog>
  );
}
