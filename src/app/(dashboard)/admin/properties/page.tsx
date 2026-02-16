import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { PropertyActionsBar } from "@/components/properties/property-actions-bar";
import { getI18nText, formatPrice, formatPropertyType, formatBusinessType } from "@/lib/utils/format";
import type { Property } from "@/lib/supabase/types";

export const metadata = {
  title: "Propiedades",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = parseInt(params.page || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.search) {
    query = query.textSearch("fts", params.search, {
      type: "websearch",
      config: "spanish",
    });
  }

  const { data: properties, count } = await query;
  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Propiedades</h1>
        <PropertyActionsBar />
      </div>

      <GlassCard padding="none">
        {!properties || properties.length === 0 ? (
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
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"
              />
            </svg>
            <p className="text-text-secondary mb-4">
              No hay propiedades registradas
            </p>
            <Link href="/admin/properties/new">
              <GlassButton size="sm">Agregar primera propiedad</GlassButton>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-glass">
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
                      className="hover:bg-white/[0.02] transition-colors"
                    >
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
                            prop.business_type === "venta"
                              ? "#10B981"
                              : "#3B82F6"
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-glass">
                <p className="text-sm text-text-muted">
                  {count} propiedades — Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/admin/properties?page=${page - 1}`}>
                      <GlassButton variant="secondary" size="sm">
                        Anterior
                      </GlassButton>
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/admin/properties?page=${page + 1}`}>
                      <GlassButton variant="secondary" size="sm">
                        Siguiente
                      </GlassButton>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}
