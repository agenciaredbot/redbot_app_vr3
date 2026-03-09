"use client";

import { useState, useCallback, useRef } from "react";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  generateImportPreview,
  generatePropertyFingerprint,
  detectDuplicatesInFile,
  MAPPABLE_FIELDS,
  type ImportPreview,
  type ImportRow,
  type PropertyInsertData,
} from "@/lib/utils/property-import";
import { generateUniqueSlug } from "@/lib/utils/slug";

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

type ImportSource = "excel" | "web";
type ImportStep =
  | "source_select"
  | "upload"
  | "scrape_url"
  | "scrape_progress"
  | "preview"
  | "importing"
  | "results";

const MAX_SCRAPE_PAGES = 20;
const MAX_SCRAPE_PROPERTIES = 500;

export function PropertyImportDialog({
  open,
  onClose,
  onSuccess,
}: PropertyImportDialogProps) {
  // Shared state
  const [step, setStep] = useState<ImportStep>("source_select");
  const [source, setSource] = useState<ImportSource | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Excel-specific state
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Web scrape state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeProperties, setScrapeProperties] = useState<PropertyInsertData[]>([]);
  const [scrapeProgress, setScrapeProgress] = useState({
    page: 0,
    total: 0,
    siteTitle: "",
  });
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeStopped, setScrapeStopped] = useState(false);
  const scrapeAbortRef = useRef(false);

  // ─── Source Selection ────────────────────────────────────────────

  const selectSource = (s: ImportSource) => {
    setSource(s);
    setStep(s === "excel" ? "upload" : "scrape_url");
  };

  // ─── Excel Handlers ──────────────────────────────────────────────

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

      if (fileBuffer) {
        const previewData = generateImportPreview(fileBuffer, newOverrides);
        setPreview(previewData);
      }
    },
    [manualOverrides, fileBuffer]
  );

  // ─── Web Scrape Handlers ─────────────────────────────────────────

  const startScraping = async () => {
    if (!scrapeUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(scrapeUrl);
    } catch {
      setScrapeError("URL inválida. Incluye https:// al inicio.");
      return;
    }

    setScrapeError(null);
    setScrapeStopped(false);
    scrapeAbortRef.current = false;
    setScrapeProperties([]);
    setScrapeProgress({ page: 0, total: 0, siteTitle: "" });
    setStep("scrape_progress");

    let currentUrl = scrapeUrl.trim();
    let pageNumber = 1;
    let allProperties: PropertyInsertData[] = [];

    while (currentUrl && pageNumber <= MAX_SCRAPE_PAGES) {
      // Check if user stopped
      if (scrapeAbortRef.current) break;

      setScrapeProgress((prev) => ({ ...prev, page: pageNumber }));

      try {
        const response = await fetch("/api/properties/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: currentUrl, pageNumber }),
        });

        if (!response.ok) {
          const data = await response.json();
          setScrapeError(data.error || "Error extrayendo propiedades");
          break;
        }

        const data = await response.json();
        allProperties = [...allProperties, ...data.properties];
        setScrapeProperties(allProperties);
        setScrapeProgress({
          page: pageNumber,
          total: allProperties.length,
          siteTitle: data.siteTitle || "",
        });

        // Continue to next page?
        if (
          data.nextPageUrl &&
          allProperties.length < MAX_SCRAPE_PROPERTIES &&
          !scrapeAbortRef.current
        ) {
          currentUrl = data.nextPageUrl;
          pageNumber++;
        } else {
          break;
        }
      } catch {
        setScrapeError("Error de conexión. Intenta de nuevo.");
        break;
      }
    }

    // Build preview from scraped properties
    if (allProperties.length > 0) {
      const previewData = buildPreviewFromScrapedProperties(allProperties);
      setPreview(previewData);
      setStep("preview");
    } else if (!scrapeError) {
      setScrapeError("No se encontraron propiedades en esta página.");
    }
  };

  const stopScraping = () => {
    scrapeAbortRef.current = true;
    setScrapeStopped(true);

    // If we have properties, go to preview
    if (scrapeProperties.length > 0) {
      const previewData = buildPreviewFromScrapedProperties(scrapeProperties);
      setPreview(previewData);
      setStep("preview");
    }
  };

  // ─── Shared Handlers ─────────────────────────────────────────────

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
    resetAll();
    onClose();
  };

  const resetAll = () => {
    setStep("source_select");
    setSource(null);
    setFile(null);
    setFileBuffer(null);
    setPreview(null);
    setManualOverrides({});
    setResult(null);
    setParseError(null);
    setScrapeUrl("");
    setScrapeProperties([]);
    setScrapeProgress({ page: 0, total: 0, siteTitle: "" });
    setScrapeError(null);
    setScrapeStopped(false);
    scrapeAbortRef.current = false;
  };

  const goBack = () => {
    if (step === "upload" || step === "scrape_url") {
      setStep("source_select");
      setSource(null);
      setParseError(null);
      setScrapeError(null);
    } else if (step === "preview") {
      if (source === "excel") {
        setStep("upload");
        setPreview(null);
      } else {
        setStep("scrape_url");
        setPreview(null);
      }
    }
  };

  const dialogWidth =
    step === "preview" || step === "scrape_progress" ? "max-w-4xl" : "max-w-lg";

  return (
    <GlassDialog
      open={open}
      onClose={handleClose}
      title="Importar propiedades"
      className={dialogWidth}
    >
      <div className="space-y-4">
        {/* ─── Source Selection ─── */}
        {step === "source_select" && (
          <>
            <p className="text-sm text-text-secondary">
              Elige cómo quieres importar tus propiedades
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Excel option */}
              <button
                onClick={() => selectSource("excel")}
                className="p-5 rounded-xl border border-border-glass hover:border-accent-blue/40 hover:bg-accent-blue/5 transition-all text-left group"
              >
                <svg
                  className="w-8 h-8 mb-3 text-accent-green group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-sm font-medium text-text-primary">
                  Desde Excel / CSV
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Sube un archivo .xlsx o .csv con tus propiedades
                </p>
              </button>

              {/* Web scrape option */}
              <button
                onClick={() => selectSource("web")}
                className="p-5 rounded-xl border border-border-glass hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all text-left group"
              >
                <svg
                  className="w-8 h-8 mb-3 text-accent-purple group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                <h3 className="text-sm font-medium text-text-primary">
                  Desde página web
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Extrae propiedades automáticamente de un sitio web
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <GlassButton variant="secondary" onClick={handleClose}>
                Cancelar
              </GlassButton>
            </div>
          </>
        )}

        {/* ─── Excel Upload ─── */}
        {step === "upload" && (
          <>
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

            <div className="flex gap-3 justify-between pt-2">
              <GlassButton variant="secondary" onClick={goBack}>
                Volver
              </GlassButton>
              <GlassButton variant="secondary" onClick={handleClose}>
                Cancelar
              </GlassButton>
            </div>
          </>
        )}

        {/* ─── Web Scrape: URL Input ─── */}
        {step === "scrape_url" && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Ingresa la URL de un sitio web con listados de propiedades.
                La IA extraerá automáticamente la información.
              </p>

              <div>
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={(e) => {
                    setScrapeUrl(e.target.value);
                    setScrapeError(null);
                  }}
                  placeholder="https://www.ejemplo.com/propiedades"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-transparent transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") startScraping();
                  }}
                />
              </div>

              {scrapeError && (
                <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
                  {scrapeError}
                </div>
              )}

              <div className="text-xs text-text-muted space-y-1">
                <p>Funciona con portales inmobiliarios y páginas propias de agencias.</p>
                <p>Detecta automáticamente paginación y navega todas las páginas.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-between pt-2">
              <GlassButton variant="secondary" onClick={goBack}>
                Volver
              </GlassButton>
              <GlassButton
                onClick={startScraping}
                disabled={!scrapeUrl.trim()}
              >
                Iniciar extracción
              </GlassButton>
            </div>
          </>
        )}

        {/* ─── Web Scrape: Progress ─── */}
        {step === "scrape_progress" && (
          <div className="py-6 space-y-4">
            <div className="text-center">
              {!scrapeError && !scrapeStopped && (
                <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              )}

              {scrapeProgress.siteTitle && (
                <p className="text-xs text-text-muted mb-2">
                  {scrapeProgress.siteTitle}
                </p>
              )}

              <p className="text-sm text-text-secondary">
                {scrapeError ? (
                  <span className="text-accent-red">{scrapeError}</span>
                ) : scrapeStopped ? (
                  "Extracción detenida"
                ) : (
                  <>
                    Extrayendo página {scrapeProgress.page}...
                  </>
                )}
              </p>

              {scrapeProgress.total > 0 && (
                <p className="text-lg font-semibold text-text-primary mt-2">
                  {scrapeProgress.total} propiedad{scrapeProgress.total !== 1 ? "es" : ""} encontrada{scrapeProgress.total !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Page-by-page progress bars */}
            {scrapeProgress.page > 0 && (
              <div className="flex gap-1 justify-center">
                {Array.from({ length: scrapeProgress.page }, (_, i) => (
                  <div
                    key={i}
                    className="w-6 h-1.5 rounded-full bg-accent-purple/60"
                  />
                ))}
                {!scrapeError && !scrapeStopped && (
                  <div className="w-6 h-1.5 rounded-full bg-accent-purple/20 animate-pulse" />
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              {!scrapeError && !scrapeStopped && (
                <GlassButton variant="secondary" onClick={stopScraping}>
                  Detener y continuar
                </GlassButton>
              )}
              {(scrapeError || scrapeStopped) && scrapeProperties.length === 0 && (
                <GlassButton variant="secondary" onClick={() => setStep("scrape_url")}>
                  Volver
                </GlassButton>
              )}
              {scrapeError && scrapeProperties.length > 0 && (
                <GlassButton
                  onClick={() => {
                    const previewData = buildPreviewFromScrapedProperties(scrapeProperties);
                    setPreview(previewData);
                    setStep("preview");
                  }}
                >
                  Continuar con {scrapeProperties.length} propiedades
                </GlassButton>
              )}
            </div>
          </div>
        )}

        {/* ─── Preview ─── */}
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
              {source === "web" && (
                <span className="px-3 py-1 rounded-lg bg-accent-purple/10 border border-accent-purple/20 text-accent-purple">
                  Extraído de web
                </span>
              )}
              {source === "excel" && preview.availableSheets.length > 1 && (
                <span className="px-3 py-1 rounded-lg bg-bg-glass border border-border-glass text-text-muted">
                  Hoja: {preview.sheetName}
                </span>
              )}
            </div>

            {/* Column Mappings (Excel only) */}
            {source === "excel" && (
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
            )}

            {/* Data Preview Table */}
            {preview.sampleData.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border-glass">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-bg-glass/50">
                      <th className="px-3 py-2 text-left text-text-muted font-medium">Título</th>
                      <th className="px-3 py-2 text-left text-text-muted font-medium">Tipo</th>
                      <th className="px-3 py-2 text-left text-text-muted font-medium">Negocio</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">Precio</th>
                      <th className="px-3 py-2 text-left text-text-muted font-medium">Ciudad</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">Área</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">Hab</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">Baños</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">Fotos</th>
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
                          <td className="px-3 py-1.5 text-text-secondary text-right">
                            {Number(row.fotos) > 0 ? (
                              <span className="text-accent-green">{String(row.fotos)}</span>
                            ) : "—"}
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
              <GlassButton variant="secondary" onClick={goBack}>
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

        {/* ─── Importing ─── */}
        {step === "importing" && (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              Importando {preview?.validCount} propiedades...
            </p>
          </div>
        )}

        {/* ─── Results ─── */}
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

            <div className="flex gap-3 justify-between pt-2">
              <GlassButton variant="secondary" onClick={resetAll}>
                Importar más
              </GlassButton>
              <GlassButton onClick={handleClose}>Cerrar</GlassButton>
            </div>
          </>
        )}
      </div>
    </GlassDialog>
  );
}

// ─── Helper: Build ImportPreview from scraped PropertyInsertData[] ───

function buildPreviewFromScrapedProperties(
  properties: PropertyInsertData[]
): ImportPreview {
  // Convert to ImportRow format
  const rows: ImportRow[] = properties.map((p, idx) => {
    const errors: string[] = [];
    if (!p.title.es || p.title.es.length < 3) {
      errors.push("Título es requerido (mínimo 3 caracteres)");
    }
    return {
      rowNumber: idx + 1,
      data: {
        title: p.title.es,
        property_type: p.property_type,
        business_type: p.business_type,
        sale_price: p.sale_price,
        rent_price: p.rent_price,
        city: p.city,
      },
      errors,
      property: errors.length === 0 ? p : undefined,
    };
  });

  // Detect duplicates
  const duplicates = detectDuplicatesInFile(rows);
  for (const row of rows) {
    if (duplicates.has(row.rowNumber)) {
      row.errors.push("Posible duplicado");
      row.property = undefined;
    }
  }

  const validCount = rows.filter((r) => r.property).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  // Sample data for preview table
  const sampleData = rows.slice(0, 5).map((r) => {
    if (r.property) {
      return {
        titulo: r.property.title.es,
        tipo: r.property.property_type,
        negocio: r.property.business_type,
        precio: r.property.sale_price || r.property.rent_price || 0,
        ciudad: r.property.city || "—",
        area: r.property.built_area_m2 ?? "—",
        hab: r.property.bedrooms,
        banos: r.property.bathrooms,
        fotos: r.property.images.length,
      };
    }
    return {
      titulo: String(r.data.title || "—"),
      tipo: "—",
      negocio: "—",
      precio: 0,
      ciudad: "—",
      area: "—",
      hab: 0,
      banos: 0,
      fotos: 0,
      _error: true,
    };
  });

  return {
    rows,
    columnMappings: [], // No column mapping for web scrape
    unmappedHeaders: [],
    sheetName: "Web",
    availableSheets: ["Web"],
    totalRows: properties.length,
    validCount,
    errorCount,
    duplicateCount: duplicates.size,
    sampleData,
  };
}
