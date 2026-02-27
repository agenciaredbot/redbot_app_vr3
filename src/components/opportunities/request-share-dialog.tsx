"use client";

import { useState } from "react";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";

interface RequestShareDialogProps {
  open: boolean;
  onClose: () => void;
  property: {
    id: string;
    title: { es?: string } | null;
    org_name: string;
    city: string;
    property_type: string;
  } | null;
  onSuccess: () => void;
}

export function RequestShareDialog({
  open,
  onClose,
  property,
  onSuccess,
}: RequestShareDialogProps) {
  const [message, setMessage] = useState("");
  const [commission, setCommission] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getTitle = (title: { es?: string } | null) => {
    if (!title) return "Sin título";
    if (typeof title === "object") return title.es || "Sin título";
    return String(title);
  };

  const handleSubmit = async () => {
    if (!property) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          request_message: message || null,
          commission_percent: commission ? parseFloat(commission) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al enviar solicitud");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMessage("");
    setCommission("");
    setError("");
    onClose();
  };

  if (!property) return null;

  return (
    <GlassDialog
      open={open}
      onClose={handleClose}
      title="Solicitar Compartir Propiedad"
      description={`Enviarás una solicitud a ${property.org_name} para compartir esta propiedad en tu portal.`}
      actions={
        <div className="flex items-center gap-2">
          <GlassButton variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" onClick={handleSubmit} loading={loading}>
            Enviar Solicitud
          </GlassButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Property info */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-border-glass">
          <p className="text-sm font-semibold text-text-primary">{getTitle(property.title)}</p>
          <p className="text-xs text-text-muted mt-1">
            {property.property_type?.replace("_", " ")} &bull; {property.city} &bull; {property.org_name}
          </p>
        </div>

        {/* Message */}
        <GlassTextarea
          label="Mensaje (opcional)"
          placeholder="Explica por qué te interesa esta propiedad o menciona detalles relevantes..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {/* Commission */}
        <GlassInput
          label="Comisión propuesta (%)"
          type="number"
          placeholder="ej: 3.5"
          helperText="El porcentaje de comisión que ofreces al dueño de la propiedad"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    </GlassDialog>
  );
}
