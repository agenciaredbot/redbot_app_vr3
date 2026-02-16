"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { GlassSelect } from "@/components/ui/glass-select";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { PROPERTY_TYPES, BUSINESS_TYPES } from "@/config/constants";

interface PropertyFiltersProps {
  currentFilters: Record<string, string | undefined>;
}

export function PropertyFilters({ currentFilters }: PropertyFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Preserve slug param if present
      const slug = searchParams.get("slug");
      if (slug) params.set("slug", slug);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    const slug = searchParams.get("slug");
    router.push(slug ? `${pathname}?slug=${slug}` : pathname);
  }, [router, pathname, searchParams]);

  const hasFilters = Object.keys(currentFilters).some(
    (k) => k !== "slug" && currentFilters[k]
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <GlassInput
          variant="search"
          placeholder="Buscar propiedades..."
          defaultValue={currentFilters.search || ""}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              updateFilter("search", (e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>
      <div className="w-40">
        <GlassSelect
          options={PROPERTY_TYPES}
          placeholder="Tipo"
          value={currentFilters.type || ""}
          onChange={(e) => updateFilter("type", e.target.value)}
        />
      </div>
      <div className="w-40">
        <GlassSelect
          options={BUSINESS_TYPES}
          placeholder="Negocio"
          value={currentFilters.business || ""}
          onChange={(e) => updateFilter("business", e.target.value)}
        />
      </div>
      <div className="w-32">
        <GlassInput
          type="number"
          placeholder="Habitaciones"
          defaultValue={currentFilters.bedrooms || ""}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              updateFilter("bedrooms", (e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>
      {hasFilters && (
        <GlassButton variant="ghost" size="sm" onClick={clearFilters}>
          Limpiar
        </GlassButton>
      )}
    </div>
  );
}
