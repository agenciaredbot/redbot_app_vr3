"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { affiliateRegisterSchema } from "@/lib/validators/affiliate";
import { GlassButton } from "@/components/ui/glass-button";
import type { z } from "zod";

type FormData = z.input<typeof affiliateRegisterSchema>;

export function AffiliateRegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(affiliateRegisterSchema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await fetch("/api/affiliates/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error al registrarse");
      }

      setSuccess(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  if (success) {
    return (
      <div className="text-center py-6">
        <svg className="w-16 h-16 mx-auto text-green-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Registro Exitoso</h2>
        <p className="text-text-muted text-sm">
          Revisa tu correo para confirmar tu cuenta. Una vez confirmada,
          nuestro equipo revisará tu solicitud y te notificará cuando sea aprobada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm text-text-secondary mb-1">Nombre completo</label>
        <input
          {...register("fullName")}
          type="text"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          placeholder="Tu nombre"
        />
        {errors.fullName && (
          <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Correo electrónico</label>
        <input
          {...register("email")}
          type="email"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          placeholder="tu@correo.com"
        />
        {errors.email && (
          <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Contraseña</label>
        <input
          {...register("password")}
          type="password"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          placeholder="Mínimo 6 caracteres"
        />
        {errors.password && (
          <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">
          Teléfono <span className="text-text-muted">(opcional)</span>
        </label>
        <input
          {...register("phone")}
          type="tel"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          placeholder="3001234567"
        />
      </div>

      {serverError && (
        <p className="text-red-400 text-sm">{serverError}</p>
      )}

      <GlassButton type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Registrando..." : "Registrarme como Afiliado"}
      </GlassButton>
    </form>
  );
}
