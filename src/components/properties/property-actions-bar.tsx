"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassButton } from "@/components/ui/glass-button";
import { PropertyImportDialog } from "./property-import-dialog";

export function PropertyActionsBar() {
  const [importOpen, setImportOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const [searchValue, setSearchValue] = useState(currentSearch);

  // Sync input with URL when navigating
  useEffect(() => {
    setSearchValue(searchParams.get("search") || "");
  }, [searchParams]);

  // Debounced search — update URL after 400ms of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
        params.delete("page"); // Reset to page 1 on search
      } else {
        params.delete("search");
      }

      const qs = params.toString();
      router.push(`/admin/properties${qs ? `?${qs}` : ""}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSearch = useCallback(() => {
    setSearchValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    const qs = params.toString();
    router.push(`/admin/properties${qs ? `?${qs}` : ""}`);
  }, [searchParams, router]);

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar propiedad..."
            className="w-56 pl-10 pr-8 py-2 rounded-xl bg-white/[0.05] border border-border-glass text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent transition-all"
          />
          {searchValue && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Limpiar búsqueda"
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
          )}
        </div>

        <GlassButton
          variant="secondary"
          size="sm"
          onClick={() => setImportOpen(true)}
        >
          Importar Excel
        </GlassButton>
        <Link href="/admin/properties/new">
          <GlassButton size="sm">Agregar propiedad</GlassButton>
        </Link>
      </div>

      <PropertyImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
