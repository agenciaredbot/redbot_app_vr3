"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { PORTAL_REGISTRY, type PortalConnection } from "@/lib/portals/types";

type ViewState = "loading" | "ready" | "upgrade-required" | "error";

const proppit = PORTAL_REGISTRY.proppit;

export function PortalManager() {
  const [connection, setConnection] = useState<PortalConnection | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const fetchConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/portals");
      const data = await res.json();

      if (res.status === 403 && data.requiredPlan) {
        setViewState("upgrade-required");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Error al cargar portales");
        setViewState("error");
        return;
      }

      const connections: PortalConnection[] = data.connections || [];
      const proppitConn = connections.find((c) => c.portal_slug === "proppit");
      setConnection(proppitConn || null);
      setViewState("ready");
    } catch {
      setError("Error de conexión");
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal_slug: "proppit" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al activar");
      }
      await fetchConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar");
    } finally {
      setActivating(false);
    }
  };

  const handleToggle = async () => {
    if (!connection) return;
    await fetch("/api/portals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: connection.id, is_active: !connection.is_active }),
    });
    await fetchConnection();
  };

  const handleSync = async () => {
    if (!connection) return;
    setSyncing(true);
    try {
      await fetch("/api/portals/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id }),
      });
      await fetchConnection();
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    if (confirmDisconnect) {
      await fetch("/api/portals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: connection.id }),
      });
      setConfirmDisconnect(false);
      await fetchConnection();
    } else {
      setConfirmDisconnect(true);
      setTimeout(() => setConfirmDisconnect(false), 3000);
    }
  };

  const feedUrl = connection
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/portals/feed/${connection.id}`
    : null;

  const handleCopyFeedUrl = async () => {
    if (feedUrl) {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading
  if (viewState === "loading") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Portales</h1>
        <GlassCard className="p-8 text-center">
          <div className="animate-pulse text-text-muted">Cargando...</div>
        </GlassCard>
      </div>
    );
  }

  // Upgrade required
  if (viewState === "upgrade-required") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Portales</h1>
        <GlassCard className="p-8 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Publicación en portales
          </h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Publica tus propiedades en Properati, Trovit, Mitula y más portales
            inmobiliarios. Disponible en el plan Power o superior.
          </p>
          <GlassButton
            onClick={() => (window.location.href = "/admin/billing")}
            variant="primary"
          >
            Actualizar plan
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  // Error
  if (viewState === "error") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Portales</h1>
        <GlassCard className="p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <GlassButton onClick={fetchConnection}>Reintentar</GlassButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Portales</h1>
        <p className="text-text-secondary mt-1">
          Publica tus propiedades en los principales portales inmobiliarios
        </p>
      </div>

      <GlassCard className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 border border-border-glass flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{proppit.name}</h2>
              <p className="text-sm text-text-muted">{proppit.description}</p>
            </div>
          </div>
          {connection && (
            connection.is_active
              ? <GlassBadge color="#10B981">Activo</GlassBadge>
              : <GlassBadge color="#F59E0B">Pausado</GlassBadge>
          )}
        </div>

        {/* Not connected — show benefits + activate button */}
        {!connection && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.03] border border-border-glass">
                <svg className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-text-primary">Gratis</span>
                  <p className="text-xs text-text-muted">Listados básicos sin costo</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.03] border border-border-glass">
                <svg className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-text-primary">7+ portales</span>
                  <p className="text-xs text-text-muted">Una sola activación</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.03] border border-border-glass">
                <svg className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-text-primary">Automático</span>
                  <p className="text-xs text-text-muted">Sync cada 24 horas</p>
                </div>
              </div>
            </div>

            {/* Included portals */}
            <div className="mb-5 p-3 rounded-lg bg-white/[0.03] border border-border-glass">
              <span className="text-xs text-text-muted block mb-2">Portales incluidos:</span>
              <div className="flex flex-wrap gap-2">
                {proppit.includedPortals.map((name) => (
                  <span
                    key={name}
                    className="text-xs px-2 py-1 rounded-md bg-white/[0.06] text-text-secondary border border-border-glass"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <GlassButton
              onClick={handleActivate}
              variant="primary"
              disabled={activating}
              className="w-full"
            >
              {activating ? "Activando..." : "Activar Proppit"}
            </GlassButton>

            {error && (
              <p className="text-sm text-red-400 mt-3 text-center">{error}</p>
            )}
          </>
        )}

        {/* Connected — show feed URL + instructions */}
        {connection && (
          <>
            {/* Stats */}
            <div className="flex items-center gap-6 mb-5 text-sm">
              <div className="text-text-muted">
                <span className="text-text-primary font-semibold text-lg">
                  {connection.properties_synced}
                </span>{" "}
                propiedades en el feed
              </div>
              {connection.last_sync_at && (
                <div className="text-text-muted">
                  Sync:{" "}
                  {new Date(connection.last_sync_at).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>

            {/* Error message */}
            {connection.last_sync_error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {connection.last_sync_error}
              </div>
            )}

            {/* Feed URL */}
            {connection.is_active && feedUrl && (
              <div className="mb-5">
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                  URL del feed XML
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="flex-1 bg-white/[0.03] border border-border-glass rounded-lg px-3 py-2 text-sm text-text-secondary font-mono truncate"
                  />
                  <GlassButton onClick={handleCopyFeedUrl} variant="secondary" size="sm">
                    {copied ? "Copiado" : "Copiar"}
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Step-by-step instructions */}
            {connection.is_active && (
              <div className="mb-5 p-4 rounded-lg bg-accent-blue/5 border border-accent-blue/20">
                <h4 className="text-sm font-semibold text-text-primary mb-3">
                  Cómo conectar con Proppit
                </h4>
                <ol className="space-y-2 text-sm text-text-secondary">
                  <li className="flex gap-2">
                    <span className="text-accent-blue font-semibold flex-shrink-0">1.</span>
                    <span>
                      Crea tu cuenta gratuita en{" "}
                      <a
                        href="https://proppit.com/?country=co"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-blue hover:underline"
                      >
                        proppit.com
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent-blue font-semibold flex-shrink-0">2.</span>
                    <span>En tu panel de Proppit, busca la opción para importar un feed XML</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent-blue font-semibold flex-shrink-0">3.</span>
                    <span>Pega la URL del feed que copiaste arriba</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent-blue font-semibold flex-shrink-0">4.</span>
                    <span>
                      Tus propiedades aparecerán automáticamente en los 7 portales
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Included portals */}
            <div className="mb-5 p-3 rounded-lg bg-white/[0.03] border border-border-glass">
              <span className="text-xs text-text-muted block mb-2">Portales incluidos:</span>
              <div className="flex flex-wrap gap-2">
                {proppit.includedPortals.map((name) => (
                  <span
                    key={name}
                    className="text-xs px-2 py-1 rounded-md bg-white/[0.06] text-text-secondary border border-border-glass"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <GlassButton
                onClick={handleToggle}
                variant={connection.is_active ? "secondary" : "primary"}
                size="sm"
              >
                {connection.is_active ? "Pausar" : "Reactivar"}
              </GlassButton>
              <GlassButton
                onClick={handleSync}
                variant="secondary"
                size="sm"
                disabled={syncing || !connection.is_active}
              >
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </GlassButton>
              <GlassButton onClick={handleDisconnect} variant="danger" size="sm">
                {confirmDisconnect ? "Confirmar" : "Desconectar"}
              </GlassButton>
            </div>

            <p className="text-[11px] text-text-muted mt-4">
              Todas las propiedades publicadas y disponibles aparecen automáticamente en el feed.
              Proppit sincroniza el feed cada 24-48 horas.
            </p>
          </>
        )}
      </GlassCard>
    </div>
  );
}
