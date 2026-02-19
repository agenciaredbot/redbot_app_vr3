"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface VerifyEmailClientProps {
  email: string | null;
}

export function VerifyEmailClient({ email }: VerifyEmailClientProps) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email || resending || cooldown > 0) return;

    setResending(true);
    setError(null);
    setResent(false);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setResent(true);
        setCooldown(60); // 60 second cooldown
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setResending(false);
    }
  }, [email, resending, cooldown]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8 text-center">
          <Image
            src="/redbot-logo-dark-background.png"
            alt="Redbot"
            width={180}
            height={50}
            className="mx-auto mb-6"
          />

          {/* Email icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Revisa tu correo
          </h1>

          <p className="text-text-secondary mb-1">
            Enviamos un enlace de verificación a:
          </p>

          {email && (
            <p className="text-accent-blue font-medium mb-4">
              {email}
            </p>
          )}

          <p className="text-sm text-text-muted mb-6">
            Haz clic en el enlace del correo para activar tu cuenta.
            Si no lo ves, revisa tu carpeta de spam.
          </p>

          {/* Resend feedback */}
          {error && (
            <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm mb-4">
              {error}
            </div>
          )}

          {resent && (
            <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm mb-4">
              Correo reenviado exitosamente.
            </div>
          )}

          <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-text-secondary mb-6">
            El enlace expira en 1 hora. Si no recibiste el correo, usa el botón de reenviar.
          </div>

          <Link
            href="/login"
            className="block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity text-center mb-3"
          >
            Ya verifiqué, ir a iniciar sesión
          </Link>

          {email && (
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full py-3 px-4 rounded-xl border border-border-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? "Reenviando..."
                : cooldown > 0
                  ? `Reenviar correo (${cooldown}s)`
                  : "Reenviar correo de verificación"}
            </button>
          )}

          <p className="mt-4 text-sm text-text-muted">
            ¿Email incorrecto?{" "}
            <Link
              href="/register"
              className="text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Registrarte de nuevo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
