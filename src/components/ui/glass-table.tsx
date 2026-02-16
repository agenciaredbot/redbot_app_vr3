"use client";

import { type ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface GlassTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function GlassTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No se encontraron resultados",
  onRowClick,
}: GlassTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-glass">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-glass">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={`
                transition-colors
                ${onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : ""}
              `}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border-glass">
      <p className="text-sm text-text-muted">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-border-glass text-text-secondary hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-border-glass text-text-secondary hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
