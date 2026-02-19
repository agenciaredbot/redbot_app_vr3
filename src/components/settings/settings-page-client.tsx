"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";
import { GlassBadge } from "@/components/ui/glass-badge";
import { LogoUpload } from "./logo-upload";

interface Organization {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  logo_light_url: string | null;
  favicon_url: string | null;
  theme_mode: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  agent_name: string | null;
  agent_personality: string | null;
  agent_welcome_message: { es?: string } | null;
  agent_language: string | null;
  plan_tier: string;
  plan_status: string;
  max_properties: number;
  max_conversations_per_month: number;
  conversations_used_this_month: number;
}

interface SettingsPageClientProps {
  org: Organization;
  canEdit: boolean;
}

function SaveIndicator({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) {
    return <p className="text-xs text-text-muted">Guardando...</p>;
  }
  if (saved) {
    return <p className="text-xs text-accent-green">Guardado</p>;
  }
  return null;
}

export function SettingsPageClient({ org, canEdit }: SettingsPageClientProps) {
  // --- Branding state ---
  const [logoUrl, setLogoUrl] = useState(org.logo_url);
  const [logoLightUrl, setLogoLightUrl] = useState(org.logo_light_url);
  const [faviconUrl, setFaviconUrl] = useState(org.favicon_url);
  const [themeMode, setThemeMode] = useState<"dark" | "light">(
    (org.theme_mode as "dark" | "light") || "dark"
  );
  const [primaryColor, setPrimaryColor] = useState(org.primary_color || "#3B82F6");
  const [secondaryColor, setSecondaryColor] = useState(org.secondary_color || "#8B5CF6");
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  // --- Org info state ---
  const [name, setName] = useState(org.name || "");
  const [city, setCity] = useState(org.city || "");
  const [phone, setPhone] = useState(org.phone || "");
  const [email, setEmail] = useState(org.email || "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoLoaded, setInfoLoaded] = useState(false);

  // --- AI agent state ---
  const [agentName, setAgentName] = useState(org.agent_name || "Asistente");
  const [greeting, setGreeting] = useState(org.agent_welcome_message?.es || "");
  const [personality, setPersonality] = useState(org.agent_personality || "");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  // Mark loaded on mount (skip initial auto-save)
  useEffect(() => {
    setBrandingLoaded(true);
    setInfoLoaded(true);
    setAiLoaded(true);
  }, []);

  // --- Auto-save: Branding colors ---
  useEffect(() => {
    if (!brandingLoaded || !canEdit) return;

    setBrandingSaved(false);
    const timer = setTimeout(() => {
      setBrandingSaving(true);
      fetch("/api/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          theme_mode: themeMode,
        }),
      })
        .then((res) => {
          if (res.ok) setBrandingSaved(true);
        })
        .finally(() => setBrandingSaving(false));
    }, 800);

    return () => clearTimeout(timer);
  }, [primaryColor, secondaryColor, themeMode, brandingLoaded, canEdit]);

  // --- Auto-save: Org info ---
  useEffect(() => {
    if (!infoLoaded || !canEdit) return;

    setInfoSaved(false);
    const timer = setTimeout(() => {
      if (name) {
        setInfoSaving(true);
        fetch("/api/organizations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, city, phone, email }),
        })
          .then((res) => {
            if (res.ok) setInfoSaved(true);
          })
          .finally(() => setInfoSaving(false));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [name, city, phone, email, infoLoaded, canEdit]);

  // --- Auto-save: AI config ---
  useEffect(() => {
    if (!aiLoaded || !canEdit) return;

    setAiSaved(false);
    const timer = setTimeout(() => {
      if (agentName) {
        setAiSaving(true);
        fetch("/api/organizations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_name: agentName,
            agent_welcome_message_es: greeting || null,
            agent_personality: personality || null,
          }),
        })
          .then((res) => {
            if (res.ok) setAiSaved(true);
          })
          .finally(() => setAiSaving(false));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [agentName, greeting, personality, aiLoaded, canEdit]);

  // Logo/favicon callbacks
  const handleLogoUploaded = useCallback((url: string | null) => {
    setLogoUrl(url);
  }, []);

  const handleLogoLightUploaded = useCallback((url: string | null) => {
    setLogoLightUrl(url);
  }, []);

  const handleFaviconUploaded = useCallback((url: string | null) => {
    setFaviconUrl(url);
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>

      {/* Section 1: Branding */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Marca
          </h2>
          <SaveIndicator saving={brandingSaving} saved={brandingSaved} />
        </div>

        <div className="space-y-5">
          {/* Theme mode toggle */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Modo de la landing page
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => canEdit && setThemeMode("dark")}
                disabled={!canEdit}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  themeMode === "dark"
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border-glass text-text-secondary hover:border-border-glass-hover"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
                Oscuro
              </button>
              <button
                type="button"
                onClick={() => canEdit && setThemeMode("light")}
                disabled={!canEdit}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  themeMode === "light"
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border-glass text-text-secondary hover:border-border-glass-hover"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
                Claro
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              Define si tu landing page se muestra con fondo oscuro o claro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LogoUpload
              type="logo"
              currentUrl={logoUrl}
              onUploaded={handleLogoUploaded}
              disabled={!canEdit}
              label="Logo (fondo oscuro)"
              hint="Logo para modo oscuro. JPG, PNG, WebP o SVG. Máx 2MB."
            />
            <LogoUpload
              type="logo_light"
              currentUrl={logoLightUrl}
              onUploaded={handleLogoLightUploaded}
              disabled={!canEdit}
              label="Logo (fondo claro)"
              hint="Logo para modo claro. JPG, PNG, WebP o SVG. Máx 2MB."
            />
            <LogoUpload
              type="favicon"
              currentUrl={faviconUrl}
              onUploaded={handleFaviconUploaded}
              disabled={!canEdit}
              label="Favicon"
              hint="Ícono del navegador. PNG o SVG recomendado. Máx 2MB."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Color primario
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!canEdit}
                  className="w-10 h-10 rounded-lg border border-border-glass cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-sm text-text-secondary font-mono">
                  {primaryColor}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Color secundario
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={!canEdit}
                  className="w-10 h-10 rounded-lg border border-border-glass cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-sm text-text-secondary font-mono">
                  {secondaryColor}
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Section 2: Organization info */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Información del negocio
          </h2>
          <SaveIndicator saving={infoSaving} saved={infoSaved} />
        </div>

        <div className="space-y-4">
          <GlassInput
            label="Nombre de la empresa"
            placeholder="Inmobiliaria Ejemplo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              label="Ciudad"
              placeholder="Bogotá"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!canEdit}
            />
            <GlassInput
              label="Teléfono"
              placeholder="+57 300 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <GlassInput
            label="Email de contacto"
            placeholder="contacto@miempresa.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canEdit}
          />
          <div className="text-sm text-text-muted">
            <span className="font-medium text-text-secondary">URL:</span>{" "}
            <span className="font-mono">{org.slug}.redbot.app</span>
          </div>
        </div>
      </GlassCard>

      {/* Section 3: AI Agent */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Agente AI
          </h2>
          <SaveIndicator saving={aiSaving} saved={aiSaved} />
        </div>

        <div className="space-y-4">
          <GlassInput
            label="Nombre del agente"
            placeholder="Ej: Ana, Redbot, Asistente Virtual"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            disabled={!canEdit}
          />
          <GlassTextarea
            label="Mensaje de bienvenida"
            placeholder="Hola, soy Ana, tu asistente inmobiliario virtual. ¿En qué te puedo ayudar?"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            disabled={!canEdit}
          />
          <GlassTextarea
            label="Personalidad / instrucciones adicionales"
            placeholder="Ej: Sé muy amable y enfocado en propiedades de lujo. Habla en español colombiano informal."
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            disabled={!canEdit}
          />
          <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-text-secondary">
            El agente AI ya viene pre-configurado para búsqueda de propiedades y
            captura de leads. Estas instrucciones adicionales son opcionales y
            permiten personalizar su tono y enfoque.
          </div>
        </div>
      </GlassCard>

      {/* Section 4: Plan & Limits (read-only) */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Plan y límites
        </h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <GlassBadge color="#3B82F6">
              Plan: {org.plan_tier}
            </GlassBadge>
            <GlassBadge
              color={org.plan_status === "active" ? "#10B981" : "#F59E0B"}
            >
              {org.plan_status}
            </GlassBadge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Propiedades máximas</p>
              <p className="text-text-primary font-medium">
                {org.max_properties}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Conversaciones/mes</p>
              <p className="text-text-primary font-medium">
                {org.conversations_used_this_month} /{" "}
                {org.max_conversations_per_month}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
