"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * This page handles email confirmation when Supabase uses implicit/magic-link flow.
 * Supabase redirects here with #access_token=... as URL fragment.
 * Fragments are NOT sent to the server, so we need a client-side page to capture them.
 *
 * The Supabase client library automatically reads the hash fragment
 * and establishes the session via onAuthStateChange.
 */
export default function AuthConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // The Supabase client automatically picks up the hash fragment
    // and fires SIGNED_IN event when the session is established
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          router.replace("/admin/onboarding");
        } else if (event === "INITIAL_SESSION") {
          // Check if we already have a session (from the hash fragment)
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              router.replace("/admin/onboarding");
            }
          });
        }
      }
    );

    // Fallback: if nothing happens in 5 seconds, show error
    const timeout = setTimeout(() => {
      setError("No se pudo verificar tu cuenta. Intenta iniciar sesión.");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-text-secondary mb-4">{error}</p>
            <a
              href="/login"
              className="inline-block py-3 px-6 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity"
            >
              Ir a iniciar sesión
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-8">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">Verificando tu cuenta...</p>
        </div>
      </div>
    </div>
  );
}
