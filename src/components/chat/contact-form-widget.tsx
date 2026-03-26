"use client";

import { useState } from "react";

interface ContactFormWidgetProps {
  organizationSlug: string;
  propertyId?: string;
}

/**
 * Contact form widget for Lite plan tenant pages.
 * Captures lead info and submits to /api/contact (public endpoint).
 * Replaces the AI chat widget for organizations on the Lite plan.
 */
export function ContactFormWidget({
  organizationSlug,
  propertyId,
}: ContactFormWidgetProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
    website: "", // honeypot
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationSlug,
          propertyId,
          ...formData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al enviar");
      }

      setStatus("success");
      setFormData({ fullName: "", email: "", phone: "", message: "", website: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error al enviar el formulario");
    }
  }

  if (status === "success") {
    return (
      <div className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-2xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-green/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          Mensaje enviado
        </h3>
        <p className="text-sm text-text-secondary">
          Gracias por tu interés. Te contactaremos pronto.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Contáctanos
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          Déjanos tus datos y te responderemos a la brevedad.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot — hidden from real users */}
        <input
          type="text"
          name="website"
          value={formData.website}
          onChange={(e) => setFormData((f) => ({ ...f, website: e.target.value }))}
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-text-secondary mb-1">
              Nombre *
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-text-secondary mb-1">
              Email *
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-phone" className="block text-sm font-medium text-text-secondary mb-1">
            Teléfono
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            placeholder="+57 300 000 0000"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-text-secondary mb-1">
            Mensaje *
          </label>
          <textarea
            id="contact-message"
            required
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none"
            placeholder="Estoy interesado en..."
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-accent-red">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-accent-red to-accent-indigo text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {status === "loading" ? "Enviando..." : "Enviar mensaje"}
        </button>
      </form>
    </div>
  );
}
