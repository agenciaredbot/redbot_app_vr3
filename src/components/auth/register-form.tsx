"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);

    try {
      // Create account via API (creates org + profile)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Error al registrarse");
        setLoading(false);
        return;
      }

      // Sign in with the newly created credentials
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setError("Cuenta creada. Por favor inicia sesión manualmente.");
        setLoading(false);
        router.push("/login");
        return;
      }

      // Redirect to onboarding
      router.push("/admin/onboarding");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
