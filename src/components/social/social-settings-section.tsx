"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassBadge } from "@/components/ui/glass-badge";
import type { LateAccount } from "@/lib/social/types";

interface SocialSettingsSectionProps {
  canEdit: boolean;
}

type ConnectionState = "loading" | "disconnected" | "connected" | "error";

export function SocialSettingsSection({ canEdit }: SocialSettingsSectionProps) {
  const [state, setState] = useState<ConnectionState>("loading");
  const [accounts, setAccounts] = useState<LateAccount[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Check current connection status on mount
  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/social/accounts");
      if (res.status === 403) {
        // Feature not available for this plan
        setState("disconnected");
        return;
      }
      const data = await res.json();
      if (data.connected) {
        setAccounts(data.accounts || []);
        setState("connected");
      } else {
        setState("disconnected");
      }
    } catch {
      setState("disconnected");
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleConnect = async () => {
    if (!apiKeyInput.trim()) {
      setErrorMsg("Ingresa tu API Key de Late.");
      return;
    }

    if (!apiKeyInput.trim().startsWith("sk_")) {
      setErrorMsg("La API Key debe empezar con 'sk_'.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);

    try {
      const res = await fetch("/api/social/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Error al conectar.");
        setSaving(false);
        return;
      }

      setAccounts(data.accounts || []);
      setSuccessMsg(data.message || "Conectado exitosamente.");
      setState("connected");
      setApiKeyInput("");
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/social/connect", { method: "DELETE" });
      if (res.ok) {
        setState("disconnected");
        setAccounts([]);
        setSuccessMsg("Desconectado exitosamente.");
      } else {
        setErrorMsg("Error al desconectar.");
      }
    } catch {
      setErrorMsg("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") {
    return (
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Redes Sociales
        </h2>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando...
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-accent-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        <h2 className="text-lg font-semibold text-text-primary">
          Redes Sociales
        </h2>
        {state === "connected" && (
          <GlassBadge color="#10B981" size="sm">Conectado</GlassBadge>
        )}
      </div>

      {state === "disconnected" && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Conecta tu cuenta de Instagram para publicar tus propiedades directamente como carruseles.
            Usamos <a href="https://getlate.dev" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">Late</a> como
            intermediario para gestionar la publicación.
          </p>

          <div className="p-3 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
            <p className="text-xs text-text-secondary mb-2 font-medium">Para conectar:</p>
            <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
              <li>Crea una cuenta gratuita en <a href="https://getlate.dev" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">getlate.dev</a></li>
              <li>En Late, conecta tu cuenta de Instagram</li>
              <li>Ve a Settings &rarr; API Keys y crea una clave</li>
              <li>Pega la clave aquí abajo</li>
            </ol>
          </div>

          <GlassInput
            label="API Key de Late"
            placeholder="sk_..."
            type="password"
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value);
              setErrorMsg("");
            }}
            disabled={!canEdit || saving}
          />

          {errorMsg && (
            <p className="text-xs text-accent-red">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-xs text-accent-green">{successMsg}</p>
          )}

          <button
            onClick={handleConnect}
            disabled={!canEdit || saving || !apiKeyInput.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/20 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Conectando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Conectar Late
              </>
            )}
          </button>
        </div>
      )}

      {state === "connected" && (
        <div className="space-y-4">
          {/* Instagram accounts list */}
          {accounts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary font-medium">
                Cuentas de Instagram conectadas:
              </p>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-border-glass"
                >
                  {account.profilePictureUrl ? (
                    <img
                      src={account.profilePictureUrl}
                      alt={account.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent-pink/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="2" y="2" width="20" height="20" rx="5" />
                        <circle cx="12" cy="12" r="5" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {account.displayName || account.username}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      @{account.username}
                    </p>
                  </div>
                  <GlassBadge color="#E91E63" size="sm">Instagram</GlassBadge>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-accent-orange/5 border border-accent-orange/20">
              <p className="text-xs text-text-secondary">
                No se encontraron cuentas de Instagram conectadas en Late.
                Asegúrate de haber conectado tu Instagram en{" "}
                <a
                  href="https://getlate.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  getlate.dev
                </a>.
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-accent-red">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-xs text-accent-green">{successMsg}</p>
          )}

          {/* Disconnect button */}
          {canEdit && (
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-accent-red/80 hover:text-accent-red hover:bg-accent-red/10 transition-all disabled:opacity-50"
            >
              {saving ? "Desconectando..." : "Desconectar Late"}
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}
