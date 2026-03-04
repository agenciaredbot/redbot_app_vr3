"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { PLANS } from "@/config/plans";
import type { PlanTier } from "@/lib/supabase/types";

interface RegisterFormProps {
  planTier?: string;
  intent?: string;
}

export function RegisterForm({ planTier, intent }: RegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolvedTier = (planTier && planTier in PLANS ? planTier : "basic") as PlanTier;
  const resolvedIntent = intent === "buy" ? "buy" : "trial";
  const planName = PLANS[resolvedTier]?.name || "Starter";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      planTier: resolvedTier,
      intent: resolvedIntent,
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);

    try {
      // Create account via API (creates org + profile)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          planTier: resolvedTier,
          intent: resolvedIntent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Error al registrarse");
        setLoading(false);
        return;
      }

      if (resolvedIntent === "buy") {
        // Purchase flow: redirect to checkout page
        router.push(
          `/checkout?plan=${resolvedTier}&org=${result.organization.id}`
        );
      } else {
        // Trial flow: redirect to email verification
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Contextual banner */}
      {resolvedIntent === "buy" ? (
        <div className="p-3 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-sm text-center">
          Registrate para adquirir el plan <strong>{planName}</strong>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm text-center">
          Prueba gratuita de 5 dias — Plan Starter
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Nombre completo
        </label>
        <input
          type="text"
          {...register("fullName")}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent transition-all"
          placeholder="Juan Pérez"
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-accent-red">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Nombre de la empresa
        </label>
        <input
          type="text"
          {...register("organizationName")}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent transition-all"
          placeholder="Mi Inmobiliaria"
        />
        {errors.organizationName && (
          <p className="mt-1 text-xs text-accent-red">
            {errors.organizationName.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Correo electrónico
        </label>
        <input
          type="email"
          {...register("email")}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent transition-all"
          placeholder="tu@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-accent-red">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Contraseña
        </label>
        <input
          type="password"
          {...register("password")}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent transition-all"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-accent-red">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "Creando cuenta..."
          : resolvedIntent === "buy"
            ? `Crear cuenta y adquirir ${planName}`
            : "Crear cuenta"}
      </button>
    </form>
  );
}
