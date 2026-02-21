"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassButton } from "@/components/ui/glass-button";

interface QRCodeDisplayProps {
  base64: string;
  onRefresh: () => void;
  loading?: boolean;
}

const QR_EXPIRY_SECONDS = 60;

export function QRCodeDisplay({ base64, onRefresh, loading }: QRCodeDisplayProps) {
  const [countdown, setCountdown] = useState(QR_EXPIRY_SECONDS);
  const [expired, setExpired] = useState(false);

  const handleExpiry = useCallback(() => {
    setExpired(true);
  }, []);

  useEffect(() => {
    // Reset on new QR
    setCountdown(QR_EXPIRY_SECONDS);
    setExpired(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [base64, handleExpiry]);

  const handleRefresh = () => {
    setExpired(false);
    setCountdown(QR_EXPIRY_SECONDS);
    onRefresh();
  };

  return (
    <div className="flex flex-col items-center py-4 space-y-4">
      {/* QR Code */}
      <div className="relative">
        <div
          className={`p-3 rounded-2xl bg-white transition-opacity duration-300 ${
            expired ? "opacity-30" : "opacity-100"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`}
            alt="Código QR de WhatsApp"
            className="w-64 h-64"
          />
        </div>

        {/* Expired overlay */}
        {expired && (
          <div className="absolute inset-0 flex items-center justify-center">
            <GlassButton onClick={handleRefresh} disabled={loading} variant="primary" size="sm">
              {loading ? "Generando..." : "Generar nuevo QR"}
            </GlassButton>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!expired && (
        <>
          <div className="text-center space-y-1">
            <p className="text-sm text-text-primary font-medium">
              Escanea el código QR con tu WhatsApp
            </p>
            <p className="text-xs text-text-muted">
              Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo
            </p>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <div className="relative w-32 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-accent-cyan transition-all duration-1000 ease-linear"
                style={{
                  width: `${(countdown / QR_EXPIRY_SECONDS) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-text-muted tabular-nums">{countdown}s</span>
          </div>
        </>
      )}

      {/* Refresh button (visible when not expired) */}
      {!expired && (
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs text-text-muted hover:text-accent-cyan transition-colors"
        >
          {loading ? "Generando..." : "Generar nuevo QR"}
        </button>
      )}
    </div>
  );
}
