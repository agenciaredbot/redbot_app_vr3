"use client";

import { useState } from "react";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";

interface SharedPropertyDetail {
  id: string;
  property_id: string;
  owner_org_id: string;
  requester_org_id: string;
  status: string;
  commission_percent: number | null;
  commission_notes: string | null;
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

interface OpportunityDetailDialogProps {
  open: boolean;
  onClose: () => void;
  opportunity: SharedPropertyDetail | null;
  organizationId: string;
  onAction: () => void;
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

export function OpportunityDetailDialog({
  open,
  onClose,
  opportunity,
  organizationId,
  onAction,
}: OpportunityDetailDialogProps) {
  const [responseMessage, setResponseMessage] = useState("");
  const [commission, setCommission] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!opportunity) return null;

  const isOwner = opportunity.owner_org_id === organizationId;
  const isSender = opportunity.requester_org_id === organizationId;
  const isPending = opportunity.status === "pending";
  const property = opportunity.properties;

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
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAction = async (action: "approved" | "rejected" | "revoked") => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          response_message: responseMessage || null,
          commission_percent: commission ? parseFloat(commission) : opportunity.commission_percent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al procesar");
        return;
      }

      onAction();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      title="Detalle de Oportunidad"
      actions={
        <div className="flex items-center gap-2">
          <GlassButton variant="ghost" onClick={onClose}>
            Cerrar
          </GlassButton>

          {/* Owner actions: approve/reject pending requests */}
          {isOwner && isPending && (
            <>
              <GlassButton
                variant="danger"
                onClick={() => handleAction("rejected")}
                loading={loading}
              >
                Rechazar
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={() => handleAction("approved")}
                loading={loading}
              >
                Aprobar
              </GlassButton>
            </>
          )}

          {/* Sender can revoke pending/approved */}
          {isSender && ["pending", "approved"].includes(opportunity.status) && (
            <GlassButton
              variant="danger"
              onClick={() => handleAction("revoked")}
              loading={loading}
            >
              Revocar Solicitud
            </GlassButton>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Property card */}
        <div className="flex gap-3 p-3 rounded-lg bg-white/[0.03] border border-border-glass">
          <div className="w-20 h-20 rounded-lg bg-white/[0.03] overflow-hidden flex-shrink-0">
            {property?.images && property.images.length > 0 ? (
              <img
                src={property.images[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {getTitle(property?.title)}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {property?.property_type?.replace("_", " ")} &bull; {property?.city}
              {property?.zone && `, ${property.zone}`}
            </p>
            <p className="text-sm text-accent-blue font-semibold mt-1">
              {property?.business_type === "arriendo"
                ? `${formatPrice(property?.rent_price, property?.currency)}/mes`
                : formatPrice(property?.sale_price || 0, property?.currency || "COP")
              }
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
              {property?.bedrooms > 0 && <span>{property.bedrooms} hab</span>}
              {property?.bathrooms > 0 && <span>{property.bathrooms} baños</span>}
              {property?.built_area_m2 && <span>{property.built_area_m2} m²</span>}
            </div>
          </div>
        </div>

        {/* Status and parties */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-text-muted mb-1">Estado</p>
            <GlassBadge color={STATUS_COLORS[opportunity.status]}>
              {STATUS_LABELS[opportunity.status]}
            </GlassBadge>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Comisión</p>
            <p className="text-sm text-text-primary font-medium">
              {opportunity.commission_percent
                ? `${opportunity.commission_percent}%`
                : "Sin definir"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Solicitante</p>
            <p className="text-sm text-text-primary">
              {opportunity.requester_org?.name || "Desconocida"}
              {isSender && <span className="text-accent-blue text-xs ml-1">(tú)</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Propietario</p>
            <p className="text-sm text-text-primary">
              {opportunity.owner_org?.name || "Desconocida"}
              {isOwner && <span className="text-accent-blue text-xs ml-1">(tú)</span>}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="text-xs text-text-muted space-y-1">
          <p>Solicitado: {formatDate(opportunity.requested_at)}</p>
          {opportunity.responded_at && (
            <p>Respondido: {formatDate(opportunity.responded_at)}</p>
          )}
        </div>

        {/* Messages */}
        {opportunity.request_message && (
          <div>
            <p className="text-xs text-text-muted mb-1">Mensaje del solicitante</p>
            <p className="text-sm text-text-secondary bg-white/[0.03] rounded-lg p-3 border border-border-glass">
              {opportunity.request_message}
            </p>
          </div>
        )}

        {opportunity.response_message && (
          <div>
            <p className="text-xs text-text-muted mb-1">Respuesta del propietario</p>
            <p className="text-sm text-text-secondary bg-white/[0.03] rounded-lg p-3 border border-border-glass">
              {opportunity.response_message}
            </p>
          </div>
        )}

        {/* Response form (only for owner on pending) */}
        {isOwner && isPending && (
          <div className="space-y-3 pt-2 border-t border-border-glass">
            <GlassTextarea
              label="Mensaje de respuesta (opcional)"
              placeholder="Agrega un mensaje al aprobar o rechazar..."
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
            />
            <GlassInput
              label="Comisión (%)"
              type="number"
              placeholder={opportunity.commission_percent ? String(opportunity.commission_percent) : "ej: 3.5"}
              helperText="Define la comisión para esta compartición"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </GlassDialog>
  );
}
