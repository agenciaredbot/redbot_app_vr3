"use client";

import { useState } from "react";
import { PropertyImportDialog } from "@/components/properties/property-import-dialog";
import { GlassButton } from "@/components/ui/glass-button";
import Link from "next/link";

export function StepImportProperties() {
  const [importOpen, setImportOpen] = useState(false);
  const [imported, setImported] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Puedes importar tus propiedades desde un archivo Excel/CSV o agregarlas manualmente después.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setImportOpen(true)}
          className="p-6 rounded-xl border-2 border-dashed border-border-glass hover:border-accent-blue/50 text-center transition-colors group"
        >
          <svg
            className="w-10 h-10 mx-auto mb-3 text-text-muted group-hover:text-accent-blue transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-medium text-text-primary">
            Importar archivo
          </p>
          <p className="text-xs text-text-muted mt-1">Excel o CSV</p>
        </button>

        <Link
          href="/admin/properties/new"
          className="p-6 rounded-xl border-2 border-dashed border-border-glass hover:border-accent-purple/50 text-center transition-colors group block"
        >
          <svg
            className="w-10 h-10 mx-auto mb-3 text-text-muted group-hover:text-accent-purple transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <p className="text-sm font-medium text-text-primary">
            Agregar manualmente
          </p>
          <p className="text-xs text-text-muted mt-1">Crear una por una</p>
        </Link>
      </div>

      {imported && (
        <p className="text-xs text-accent-green">
          Propiedades importadas exitosamente.
        </p>
      )}

      <p className="text-xs text-text-muted">
        Puedes saltar este paso y agregar propiedades después desde el panel.
      </p>

      <PropertyImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          setImported(true);
        }}
      />
    </div>
  );
}
