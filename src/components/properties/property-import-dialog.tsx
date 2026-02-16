"use client";

import { useState, useCallback, useRef } from "react";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";

interface ImportResult {
  success: boolean;
  imported: number;
  total: number;
  errors: { row: number; errors: string[] }[];
  detectedColumns: Record<string, string>;
}

interface PropertyImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PropertyImportDialog({
  open,
  onClose,
  onSuccess,
}: PropertyImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      return;
    }
    setFile(f);
    setResult(null);
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

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/properties/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          imported: 0,
          total: 0,
          errors: [{ row: 0, errors: [data.error] }],
          detectedColumns: {},
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
        total: 0,
        errors: [{ row: 0, errors: ["Error de conexión"] }],
        detectedColumns: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <GlassDialog open={open} onClose={handleClose} title="Importar propiedades">
      <div className="space-y-4">
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

        {/* Selected file */}
        {file && !result && (
          <GlassCard padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-accent-green"
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
                <span className="text-sm text-text-primary">{file.name}</span>
                <span className="text-xs text-text-muted">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-text-muted hover:text-text-secondary"
              >
                <svg
                  className="w-4 h-4"
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
          </GlassCard>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {result.imported > 0 && (
              <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm">
                {result.imported} propiedad(es) importada(s) de {result.total}
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
        )}

        {/* Column format guide */}
        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer hover:text-text-secondary">
            Formato de columnas esperado
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
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

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <GlassButton variant="secondary" onClick={handleClose}>
            {result?.imported ? "Cerrar" : "Cancelar"}
          </GlassButton>
          {!result?.imported && (
            <GlassButton
              onClick={handleImport}
              loading={loading}
              disabled={!file}
            >
              Importar
            </GlassButton>
          )}
        </div>
      </div>
    </GlassDialog>
  );
}
