"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { QRCodeDisplay } from "./qr-code-display";
import type { WhatsAppInstance } from "@/lib/evolution/types";

type ViewState =
  | "loading"
  | "no-instance"
  | "connecting"
  | "connected"
  | "error"
  | "upgrade-required";

export function WhatsAppChannelClient() {
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch instance data ──
  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/instance");
      const data = await res.json();

      if (data.instance) {
        setInstance(data.instance);
        switch (data.instance.connection_status) {
          case "connected":
            setViewState("connected");
            stopPolling();
            break;
          case "connecting":
            setViewState("connecting");
            break;
          case "disconnected":
          case "failed":
            setViewState("connecting"); // Show reconnect UI
            break;
          default:
            setViewState("connecting");
        }
      } else {
        setViewState("no-instance");
      }
    } catch {
      setError("Error al cargar información de WhatsApp");
      setViewState("error");
    }
  }, []);

  // ── Polling for connection status ──
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/instance/status");
      const data = await res.json();

      if (data.instance) {
        setInstance(data.instance);
        if (data.instance.connection_status === "connected") {
          setViewState("connected");
          setQrCode(null);
          setSuccess("WhatsApp conectado exitosamente");
          stopPolling();
        }
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(pollStatus, 5000);
  }, [pollStatus]);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  useEffect(() => {
    fetchInstance();
    return () => stopPolling();
  }, [fetchInstance]);

  // ── Create instance + show QR ──
  const handleConnect = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/whatsapp/instance", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setViewState("upgrade-required");
          return;
        }
        throw new Error(data.error || "Error al crear instancia");
      }

      setInstance(data.instance);
      setQrCode(data.qrcode || null);
      setViewState("connecting");
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar WhatsApp");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Generate new QR code ──
  const handleReconnect = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/whatsapp/instance/connect", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar QR");
      }

      setQrCode(data.qrcode || null);
      setViewState("connecting");
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reconectar");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Disconnect (logout) ──
  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar WhatsApp? Los mensajes ya no serán respondidos automáticamente.")) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/whatsapp/instance", {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al desconectar");
      }

      setInstance(null);
      setQrCode(null);
      setViewState("no-instance");
      setSuccess("WhatsApp desconectado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desconectar");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading state ──
  if (viewState === "loading") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Canales</h1>
          <p className="text-text-secondary mt-1">Conecta tus canales de comunicación</p>
        </div>
        <GlassCard padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/[0.05] rounded w-1/3" />
            <div className="h-8 bg-white/[0.05] rounded w-1/2" />
            <div className="h-4 bg-white/[0.05] rounded w-2/3" />
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Canales</h1>
        <p className="text-text-secondary mt-1">
          Conecta tus canales de comunicación
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-200">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-sm text-accent-green">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-2 text-accent-green/70 hover:text-accent-green"
          >
            ✕
          </button>
        </div>
      )}

      {/* WhatsApp Card */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-3 mb-6">
          {/* WhatsApp Icon */}
          <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#25D366]" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">WhatsApp</h2>
            <p className="text-sm text-text-muted">
              Conecta tu WhatsApp para que el agente AI atienda clientes
            </p>
          </div>

          {/* Status Badge */}
          <div className="ml-auto">
            {viewState === "connected" && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent-green/10 text-accent-green border border-accent-green/20">
                Conectado
              </span>
            )}
            {viewState === "connecting" && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Esperando conexión
              </span>
            )}
            {(viewState === "no-instance" || viewState === "error") && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] text-text-muted border border-border-glass">
                Desconectado
              </span>
            )}
          </div>
        </div>

        {/* ── No Instance: Connect Button ── */}
        {viewState === "no-instance" && (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#25D366]/60" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="text-text-primary font-medium">
                Conecta tu número de WhatsApp
              </p>
              <p className="text-sm text-text-muted mt-1">
                Tu agente AI responderá automáticamente a los mensajes de WhatsApp
              </p>
            </div>
            <GlassButton
              onClick={handleConnect}
              disabled={actionLoading}
              variant="primary"
            >
              {actionLoading ? "Creando..." : "Conectar WhatsApp"}
            </GlassButton>
          </div>
        )}

        {/* ── Connecting: QR Code ── */}
        {viewState === "connecting" && (
          <div className="space-y-4">
            {qrCode ? (
              <QRCodeDisplay
                base64={qrCode}
                onRefresh={handleReconnect}
                loading={actionLoading}
              />
            ) : (
              <div className="text-center py-6 space-y-4">
                <p className="text-text-muted text-sm">
                  Genera un código QR para conectar tu WhatsApp
                </p>
                <GlassButton
                  onClick={handleReconnect}
                  disabled={actionLoading}
                  variant="secondary"
                >
                  {actionLoading ? "Generando..." : "Generar código QR"}
                </GlassButton>
              </div>
            )}

            <div className="flex justify-end">
              <GlassButton
                onClick={handleDisconnect}
                disabled={actionLoading}
                variant="ghost"
                size="sm"
              >
                Cancelar
              </GlassButton>
            </div>
          </div>
        )}

        {/* ── Connected ── */}
        {viewState === "connected" && instance && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-green/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-accent-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    WhatsApp conectado
                  </p>
                  {instance.connected_phone && (
                    <p className="text-xs text-text-muted">
                      Número: {instance.connected_phone}
                    </p>
                  )}
                  {instance.connected_at && (
                    <p className="text-xs text-text-muted">
                      Conectado el{" "}
                      {new Date(instance.connected_at).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-reply toggle info */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-border-glass">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary">Respuesta automática</p>
                  <p className="text-xs text-text-muted">
                    El agente AI responde automáticamente a los mensajes
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-accent-green/10 text-accent-green">
                  Activa
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <GlassButton
                onClick={handleDisconnect}
                disabled={actionLoading}
                variant="ghost"
                size="sm"
              >
                Desconectar WhatsApp
              </GlassButton>
            </div>
          </div>
        )}

        {/* ── Upgrade Required ── */}
        {viewState === "upgrade-required" && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-cyan/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-accent-cyan"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <div>
              <p className="text-text-primary font-medium">
                Función disponible en el plan Power
              </p>
              <p className="text-sm text-text-muted mt-1">
                Actualiza tu plan para conectar WhatsApp y atender clientes por este canal.
              </p>
            </div>
            <GlassButton
              onClick={() => (window.location.href = "/admin/billing")}
              variant="primary"
            >
              Actualizar plan
            </GlassButton>
          </div>
        )}
      </GlassCard>

      {/* Info Card */}
      <GlassCard padding="lg">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Cómo funciona
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="text-accent-cyan font-bold text-sm">1</span>
            <p className="text-sm text-text-muted">
              Conecta tu número de WhatsApp escaneando el código QR desde tu teléfono.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent-cyan font-bold text-sm">2</span>
            <p className="text-sm text-text-muted">
              Tu agente AI responderá automáticamente a los mensajes que recibas.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-accent-cyan font-bold text-sm">3</span>
            <p className="text-sm text-text-muted">
              Los leads se crean automáticamente cuando un cliente muestra interés.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
