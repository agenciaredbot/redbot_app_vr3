"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassSelect } from "@/components/ui/glass-select";

interface SharedProperty {
  id: string;
  property_id: string;
  owner_org_id: string;
  requester_org_id: string;
  status: string;
  commission_percent: number | null;
  request_message: string | null;
  response_message: string | null;
  requested_at: string;
  responded_at: string | null;
  properties: {
    id: string;
    title: { es?: string } | null;
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
  };
  owner_org: { name: string; slug: string } | null;
  requester_org: { name: string; slug: string } | null;
}

interface OpportunityListProps {
  organizationId: string;
  onViewDetail: (opportunity: SharedProperty) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
  revoked: "#6B7280",
  expired: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  revoked: "Revocada",
  expired: "Expirada",
};

const FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "sent", label: "Enviadas" },
  { value: "received", label: "Recibidas" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobadas" },
  { value: "rejected", label: "Rechazadas" },
];

export function OpportunityList({ organizationId, onViewDetail }: OpportunityListProps) {
  const [opportunities, setOpportunities] = useState<SharedProperty[]>([]);
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchOpportunities = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      filter,
      page: String(p),
      limit: "20",
    });
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/opportunities?${params}`);
      const data = await res.json();

      if (res.ok) {
        setOpportunities(data.opportunities);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Error fetching opportunities:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, status]);

  useEffect(() => {
    fetchOpportunities(1);
  }, [fetchOpportunities]);

  const getTitle = (title: { es?: string } | null) => {
    if (!title) return "Sin título";
    if (typeof title === "object") return title.es || "Sin título";
    return String(title);
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return null;
    if (currency === "COP") return `$${price.toLocaleString("es-CO")}`;
    return `$${price.toLocaleString("en-US")} ${currency}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <GlassSelect
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <GlassSelect
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <span className="text-sm text-text-muted ml-auto">
          {total} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <GlassCard padding="lg">
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
            <p className="text-text-muted mt-2 text-sm">Cargando...</p>
          </div>
        </GlassCard>
      ) : opportunities.length === 0 ? (
        <GlassCard padding="lg">
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <p className="text-text-secondary">No tienes oportunidades aún.</p>
            <p className="text-sm text-text-muted mt-1">Busca propiedades en la red para empezar a compartir.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => {
            const isSent = opp.requester_org_id === organizationId;
            const otherOrg = isSent ? opp.owner_org : opp.requester_org;
            const property = opp.properties;

            return (
              <GlassCard
                key={opp.id}
                variant="interactive"
                padding="md"
                className="cursor-pointer"
              >
                <div
                  className="flex items-center gap-4"
                  onClick={() => onViewDetail(opp)}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-white/[0.03] overflow-hidden flex-shrink-0">
                    {property?.images && property.images.length > 0 ? (
                      <img
                        src={property.images[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary truncate">
                        {getTitle(property?.title)}
                      </h3>
                      <GlassBadge color={STATUS_COLORS[opp.status]} size="sm">
                        {STATUS_LABELS[opp.status]}
                      </GlassBadge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      <span className={isSent ? "text-accent-blue" : "text-emerald-400"}>
                        {isSent ? "Enviada a" : "Recibida de"}
                      </span>
                      <span className="font-medium text-text-secondary">
                        {otherOrg?.name || "Desconocida"}
                      </span>
                      <span>&bull;</span>
                      <span>{formatDate(opp.requested_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                      <span className="capitalize">{property?.property_type?.replace("_", " ")}</span>
                      <span>&bull;</span>
                      <span>{property?.city}</span>
                      {property?.sale_price ? (
                        <>
                          <span>&bull;</span>
                          <span className="text-accent-blue">{formatPrice(property.sale_price, property.currency)}</span>
                        </>
                      ) : property?.rent_price ? (
                        <>
                          <span>&bull;</span>
                          <span className="text-accent-blue">{formatPrice(property.rent_price, property.currency)}/mes</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Commission */}
                  {opp.commission_percent && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-text-muted">Comisión</p>
                      <p className="text-sm font-semibold text-emerald-400">{opp.commission_percent}%</p>
                    </div>
                  )}

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <GlassButton
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => fetchOpportunities(page - 1)}
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
            onClick={() => fetchOpportunities(page + 1)}
          >
            Siguiente
          </GlassButton>
        </div>
      )}
    </div>
  );
}
