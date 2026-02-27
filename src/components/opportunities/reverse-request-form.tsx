"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassDialog } from "@/components/ui/glass-dialog";

interface OpportunityRequestItem {
  id: string;
  title: string;
  property_type: string | null;
  business_type: string | null;
  city: string | null;
  zone: string | null;
  min_price: number | null;
  max_price: number | null;
  min_bedrooms: number | null;
  min_bathrooms: number | null;
  min_area_m2: number | null;
  additional_notes: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  org_name: string;
  org_slug: string;
  is_mine: boolean;
  organization_id: string;
}

interface ReverseRequestFormProps {
  canCreate: boolean;
}

const PROPERTY_TYPES = [
  { value: "", label: "Cualquier tipo" },
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
];

export function ReverseRequestForm({ canCreate }: ReverseRequestFormProps) {
  const [requests, setRequests] = useState<OpportunityRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Create form state
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("");
  const [zone, setZone] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [minBathrooms, setMinBathrooms] = useState("");
  const [minArea, setMinArea] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchRequests = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/requests?page=${p}&limit=20`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests);
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  const handleCreate = async () => {
    if (!title.trim() || title.trim().length < 5) {
      setCreateError("El título debe tener al menos 5 caracteres");
      return;
    }
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/opportunities/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          property_type: propertyType || null,
          business_type: businessType || null,
          city: city || null,
          zone: zone || null,
          min_price: minPrice ? parseInt(minPrice) : null,
          max_price: maxPrice ? parseInt(maxPrice) : null,
          min_bedrooms: minBedrooms ? parseInt(minBedrooms) : null,
          min_bathrooms: minBathrooms ? parseInt(minBathrooms) : null,
          min_area_m2: minArea ? parseFloat(minArea) : null,
          additional_notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Error al crear solicitud");
        return;
      }

      // Reset form
      setTitle("");
      setPropertyType("");
      setBusinessType("");
      setCity("");
      setZone("");
      setMinPrice("");
      setMaxPrice("");
      setMinBedrooms("");
      setMinBathrooms("");
      setMinArea("");
      setNotes("");
      setShowCreateDialog(false);
      fetchRequests(1);
    } catch {
      setCreateError("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString("es-CO")}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {canCreate && (
        <div className="flex justify-end">
          <GlassButton variant="primary" onClick={() => setShowCreateDialog(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Publicar Solicitud
          </GlassButton>
        </div>
      )}

      {/* List */}
      {loading ? (
        <GlassCard padding="lg">
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
            <p className="text-text-muted mt-2 text-sm">Cargando solicitudes...</p>
          </div>
        </GlassCard>
      ) : requests.length === 0 ? (
        <GlassCard padding="lg">
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-text-secondary">No hay solicitudes activas en el mercado.</p>
            {canCreate && (
              <p className="text-sm text-text-muted mt-1">
                Publica una solicitud para que otras inmobiliarias te ofrezcan propiedades.
              </p>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <GlassCard key={req.id} padding="md" variant={req.is_mine ? "hover" : "default"}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{req.title}</h3>
                    {req.is_mine && (
                      <GlassBadge color="#6366F1" size="sm">Tuya</GlassBadge>
                    )}
                    <GlassBadge color={req.status === "active" ? "#10B981" : "#6B7280"} size="sm">
                      {req.status === "active" ? "Activa" : req.status}
                    </GlassBadge>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {req.org_name} &bull; {formatDate(req.created_at)}
                    {req.expires_at && ` &bull; Expira: ${formatDate(req.expires_at)}`}
                  </p>

                  {/* Criteria chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {req.property_type && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/[0.05] text-text-secondary capitalize">
                        {req.property_type.replace("_", " ")}
                      </span>
                    )}
                    {req.business_type && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/[0.05] text-text-secondary capitalize">
                        {req.business_type}
                      </span>
                    )}
                    {req.city && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/[0.05] text-text-secondary">
                        {req.city}
                      </span>
                    )}
                    {req.min_bedrooms && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/[0.05] text-text-secondary">
                        {req.min_bedrooms}+ hab
                      </span>
                    )}
                    {req.min_price && req.max_price && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/[0.05] text-text-secondary">
                        {formatPrice(req.min_price)} - {formatPrice(req.max_price)}
                      </span>
                    )}
                    {req.min_area_m2 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/[0.05] text-text-secondary">
                        {req.min_area_m2}+ m²
                      </span>
                    )}
                  </div>

                  {req.additional_notes && (
                    <p className="text-xs text-text-muted mt-2 line-clamp-2">{req.additional_notes}</p>
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
          <GlassButton variant="ghost" size="sm" disabled={page <= 1} onClick={() => fetchRequests(page - 1)}>
            Anterior
          </GlassButton>
          <span className="text-sm text-text-secondary">Página {page} de {totalPages}</span>
          <GlassButton variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => fetchRequests(page + 1)}>
            Siguiente
          </GlassButton>
        </div>
      )}

      {/* Create dialog */}
      <GlassDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Publicar Solicitud"
        description="Describe qué tipo de propiedad buscas. Otras inmobiliarias podrán ver tu solicitud y ofrecerte propiedades."
        actions={
          <div className="flex items-center gap-2">
            <GlassButton variant="ghost" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancelar
            </GlassButton>
            <GlassButton variant="primary" onClick={handleCreate} loading={creating}>
              Publicar
            </GlassButton>
          </div>
        }
      >
        <div className="space-y-3">
          <GlassInput
            label="Título *"
            placeholder='ej: "Busco apartamento 3 hab en Chapinero"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={createError && title.length < 5 ? "Mínimo 5 caracteres" : undefined}
          />

          <div className="grid grid-cols-2 gap-3">
            <GlassSelect
              label="Tipo de propiedad"
              options={PROPERTY_TYPES}
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            />
            <GlassSelect
              label="Negocio"
              options={BUSINESS_TYPES}
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Ciudad"
              placeholder="ej: Bogotá"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <GlassInput
              label="Zona"
              placeholder="ej: Chapinero"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Precio mínimo"
              type="number"
              placeholder="ej: 200000000"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <GlassInput
              label="Precio máximo"
              type="number"
              placeholder="ej: 500000000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <GlassInput
              label="Habitaciones mín."
              type="number"
              placeholder="ej: 3"
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(e.target.value)}
            />
            <GlassInput
              label="Baños mín."
              type="number"
              placeholder="ej: 2"
              value={minBathrooms}
              onChange={(e) => setMinBathrooms(e.target.value)}
            />
            <GlassInput
              label="Área mín. (m²)"
              type="number"
              placeholder="ej: 80"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
            />
          </div>

          <GlassTextarea
            label="Notas adicionales"
            placeholder="Detalles adicionales sobre lo que buscas..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {createError && <p className="text-sm text-red-400">{createError}</p>}
        </div>
      </GlassDialog>
    </div>
  );
}
