"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassDialog } from "@/components/ui/glass-dialog";
import {
  getI18nText,
  formatPrice,
  formatPropertyType,
  formatBusinessType,
} from "@/lib/utils/format";
import type { Property } from "@/lib/supabase/types";

type BulkAction = "delete" | "publish" | "unpublish";

interface PropertiesTableProps {
  properties: Property[];
  canBulkAction: boolean;
}

const ACTION_CONFIG: Record<
  BulkAction,
  {
    title: string;
    description: string;
    warning: string;
    confirmLabel: string;
    successLabel: string;
    variant: "primary" | "danger";
  }
> = {
  delete: {
    title: "Eliminar propiedades",
    description: "Esta acción no se puede deshacer.",
    warning:
      "Las propiedades eliminadas y sus imágenes se perderán permanentemente.",
    confirmLabel: "Eliminar",
    successLabel: "eliminada(s)",
    variant: "danger",
  },
  publish: {
    title: "Publicar propiedades",
    description: "Las propiedades serán visibles en el sitio web.",
    warning:
      "Los visitantes podrán ver estas propiedades en la página de tu inmobiliaria.",
    confirmLabel: "Publicar",
    successLabel: "publicada(s)",
    variant: "primary",
  },
  unpublish: {
    title: "Despublicar propiedades",
    description: "Las propiedades dejarán de ser visibles en el sitio web.",
    warning:
      "Los visitantes ya no podrán ver estas propiedades, pero seguirán en tu inventario.",
    confirmLabel: "Despublicar",
    successLabel: "despublicada(s)",
    variant: "primary",
  },
};

export function PropertiesTable({
  properties,
  canBulkAction,
}: PropertiesTableProps) {
  const router = useRouter();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Action state
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Derived
  const allOnPageSelected =
    properties.length > 0 && properties.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  // Indeterminate state (can't be set via JSX)
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allOnPageSelected;
    }
  }, [someSelected, allOnPageSelected]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Selection handlers
  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(properties.map((p) => p.id)));
    }
  }, [allOnPageSelected, properties]);

  // Bulk action execution
  const executeBulkAction = useCallback(async () => {
    if (!pendingAction || selectedIds.size === 0) return;
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/properties/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction,
          ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Error en la operación",
        });
      } else {
        const config = ACTION_CONFIG[pendingAction];
        setFeedback({
          type: "success",
          message: `${data.count} propiedad(es) ${config.successLabel}`,
        });
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexión" });
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }, [pendingAction, selectedIds, router]);

  return (
    <>
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mx-4 mt-4 p-3 rounded-xl border text-sm flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-accent-green/[0.08] border-accent-green/20 text-accent-green"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {feedback.type === "success" ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            )}
          </svg>
          {feedback.message}
        </div>
      )}

      {/* Bulk action bar */}
      {canBulkAction && someSelected && (
        <div className="mx-4 mt-4 flex items-center justify-between px-4 py-3 bg-accent-blue/[0.08] border border-accent-blue/20 rounded-xl backdrop-blur-xl">
          <span className="text-sm text-text-primary font-medium">
            {selectedIds.size} propiedad(es) seleccionada(s)
          </span>
          <div className="flex gap-2">
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => setPendingAction("publish")}
            >
              Publicar
            </GlassButton>
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => setPendingAction("unpublish")}
            >
              Despublicar
            </GlassButton>
            <GlassButton
              size="sm"
              variant="danger"
              onClick={() => setPendingAction("delete")}
            >
              Eliminar
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancelar
            </GlassButton>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-glass">
              {canBulkAction && (
                <th className="px-4 py-3 w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="w-4 h-4 rounded accent-accent-blue cursor-pointer"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                Propiedad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                Negocio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                Precio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                Ciudad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-glass">
            {properties.map((prop: Property) => (
              <tr
                key={prop.id}
                className={`hover:bg-white/[0.02] transition-colors ${
                  selectedIds.has(prop.id) ? "bg-accent-blue/[0.04]" : ""
                }`}
              >
                {canBulkAction && (
                  <td className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-accent-blue cursor-pointer"
                      checked={selectedIds.has(prop.id)}
                      onChange={() => toggleOne(prop.id)}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-text-primary truncate max-w-[250px]">
                    {getI18nText(prop.title)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-text-secondary">
                    {formatPropertyType(prop.property_type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <GlassBadge
                    color={
                      prop.business_type === "venta" ? "#10B981" : "#3B82F6"
                    }
                  >
                    {formatBusinessType(prop.business_type)}
                  </GlassBadge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-text-primary">
                    {prop.business_type === "arriendo"
                      ? formatPrice(prop.rent_price, prop.currency)
                      : formatPrice(prop.sale_price, prop.currency)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-text-secondary">
                    {prop.city || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <GlassBadge
                    color={prop.is_published ? "#10B981" : "#6B7280"}
                  >
                    {prop.is_published ? "Publicado" : "Borrador"}
                  </GlassBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/properties/${prop.id}/edit`}
                    className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation dialog */}
      {pendingAction && (
        <GlassDialog
          open={pendingAction !== null}
          onClose={() => !loading && setPendingAction(null)}
          title={`${ACTION_CONFIG[pendingAction].title} (${selectedIds.size})`}
          description={ACTION_CONFIG[pendingAction].description}
          actions={
            <>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setPendingAction(null)}
                disabled={loading}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                variant={ACTION_CONFIG[pendingAction].variant}
                size="sm"
                onClick={executeBulkAction}
                loading={loading}
              >
                {ACTION_CONFIG[pendingAction].confirmLabel}
              </GlassButton>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            {ACTION_CONFIG[pendingAction].warning}
          </p>
        </GlassDialog>
      )}
    </>
  );
}
