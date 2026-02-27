"use client";

import { useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";
import { GlassBadge } from "@/components/ui/glass-badge";

interface SearchProperty {
  id: string;
  title: { es?: string } | null;
  slug: string;
  property_type: string;
  business_type: string;
  city: string;
  zone: string;
  sale_price: number;
  rent_price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  built_area_m2: number | null;
  images: string[] | null;
  is_featured: boolean;
  organization_id: string;
  org_name: string;
  org_slug: string;
  share_status: string | null;
}

interface OpportunitySearchProps {
  onRequestShare: (property: SearchProperty) => void;
}

const PROPERTY_TYPES = [
  { value: "", label: "Todos los tipos" },
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "casa_campestre", label: "Casa Campestre" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
  { value: "lote", label: "Lote" },
  { value: "finca", label: "Finca" },
  { value: "bodega", label: "Bodega" },
];

const BUSINESS_TYPES = [
  { value: "", label: "Venta o Arriendo" },
  { value: "venta", label: "Venta" },
  { value: "arriendo", label: "Arriendo" },
  { value: "venta_arriendo", label: "Venta y Arriendo" },
];

export function OpportunitySearch({ onRequestShare }: OpportunitySearchProps) {
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<SearchProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async (p = 1) => {
    setLoading(true);
    setHasSearched(true);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (propertyType) params.set("property_type", propertyType);
    if (businessType) params.set("business_type", businessType);
    if (city) params.set("city", city);
    params.set("page", String(p));
    params.set("limit", "12");

    try {
      const res = await fetch(`/api/opportunities/search?${params}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("Search error:", data.error);
        return;
      }

      setResults(data.properties);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, propertyType, businessType, city]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(1);
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return null;
    if (currency === "COP") {
      return `$${price.toLocaleString("es-CO")}`;
    }
    return `$${price.toLocaleString("en-US")} ${currency}`;
  };

  const getTitle = (title: { es?: string } | null) => {
    if (!title) return "Sin título";
    if (typeof title === "object") return title.es || "Sin título";
    return String(title);
  };

  return (
    <div className="space-y-4">
      {/* Search form */}
      <GlassCard padding="md">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <GlassInput
              variant="search"
              placeholder="Buscar propiedades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <GlassSelect
              options={PROPERTY_TYPES}
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            />
            <GlassSelect
              options={BUSINESS_TYPES}
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
            <GlassInput
              placeholder="Ciudad..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <GlassButton type="submit" variant="primary" loading={loading}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Buscar en la Red
            </GlassButton>
            {hasSearched && (
              <p className="text-sm text-text-muted">
                {total} propiedad{total !== 1 ? "es" : ""} encontrada{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </form>
      </GlassCard>

      {/* Results grid */}
      {hasSearched && results.length === 0 && !loading && (
        <GlassCard padding="lg">
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p className="text-text-secondary">No se encontraron propiedades con esos criterios.</p>
            <p className="text-sm text-text-muted mt-1">Intenta con otros filtros o términos de búsqueda.</p>
          </div>
        </GlassCard>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((property) => (
            <GlassCard key={property.id} variant="interactive" padding="none">
              {/* Image */}
              <div className="aspect-[16/10] bg-white/[0.03] relative overflow-hidden rounded-t-xl">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0]}
                    alt={getTitle(property.title)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                )}
                {/* Org badge */}
                <div className="absolute top-2 left-2">
                  <GlassBadge color="#6366F1" size="sm">{property.org_name}</GlassBadge>
                </div>
                {/* Share status */}
                {property.share_status && (
                  <div className="absolute top-2 right-2">
                    <GlassBadge
                      color={property.share_status === "approved" ? "#10B981" : "#F59E0B"}
                      size="sm"
                    >
                      {property.share_status === "approved" ? "Compartida" : "Pendiente"}
                    </GlassBadge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {getTitle(property.title)}
                </h3>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="capitalize">{property.property_type?.replace("_", " ")}</span>
                  <span>&bull;</span>
                  <span>{property.city}</span>
                  {property.zone && (
                    <>
                      <span>&bull;</span>
                      <span>{property.zone}</span>
                    </>
                  )}
                </div>

                {/* Price */}
                <div className="text-accent-blue font-semibold text-sm">
                  {property.business_type === "arriendo"
                    ? formatPrice(property.rent_price, property.currency)
                    : formatPrice(property.sale_price, property.currency)
                  }
                  {property.business_type === "arriendo" && <span className="text-text-muted font-normal"> /mes</span>}
                </div>

                {/* Specs */}
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  {property.bedrooms > 0 && (
                    <span>{property.bedrooms} hab</span>
                  )}
                  {property.bathrooms > 0 && (
                    <span>{property.bathrooms} baño{property.bathrooms > 1 ? "s" : ""}</span>
                  )}
                  {property.built_area_m2 && (
                    <span>{property.built_area_m2} m²</span>
                  )}
                </div>

                {/* Action */}
                <div className="pt-2">
                  {property.share_status === "approved" ? (
                    <GlassButton variant="ghost" size="sm" disabled className="w-full">
                      Ya compartida
                    </GlassButton>
                  ) : property.share_status === "pending" ? (
                    <GlassButton variant="ghost" size="sm" disabled className="w-full">
                      Solicitud pendiente
                    </GlassButton>
                  ) : (
                    <GlassButton
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => onRequestShare(property)}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      Solicitar Compartir
                    </GlassButton>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <GlassButton
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => doSearch(page - 1)}
          >
            Anterior
          </GlassButton>
          <span className="text-sm text-text-secondary">
            Página {page} de {totalPages}
          </span>
          <GlassButton
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => doSearch(page + 1)}
          >
            Siguiente
          </GlassButton>
        </div>
      )}
    </div>
  );
}
