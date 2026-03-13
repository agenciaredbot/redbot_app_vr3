"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface PropertyPaginationProps {
  currentPage: number;
  totalPages: number;
  totalProperties: number;
}

export function PropertyPagination({
  currentPage,
  totalPages,
  totalProperties,
}: PropertyPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  if (totalPages <= 1) return null;

  // Build page numbers to show
  const pages: (number | "dots")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "dots") {
      pages.push("dots");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 mt-10">
      {/* Info */}
      <p className="text-sm text-text-secondary">
        Página {currentPage} de {totalPages} · {totalProperties} propiedades
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-all
            disabled:opacity-30 disabled:cursor-not-allowed
            text-text-secondary hover:text-text-primary
            hover:bg-white/[0.06] active:bg-white/[0.1]"
        >
          ← Anterior
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === "dots" ? (
            <span key={`dots-${i}`} className="px-2 text-text-secondary/50">
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                p === currentPage
                  ? "bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/25"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/[0.06]"
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-all
            disabled:opacity-30 disabled:cursor-not-allowed
            text-text-secondary hover:text-text-primary
            hover:bg-white/[0.06] active:bg-white/[0.1]"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
