"use client";

import { useState, useEffect } from "react";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";

export function StepAiConfig() {
  const [agentName, setAgentName] = useState("Asistente");
  const [greeting, setGreeting] = useState("");
  const [personality, setPersonality] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load current org AI config
  useEffect(() => {
    fetch("/api/organizations")
      .then((res) => res.json())
      .then((data) => {
        if (data.organization) {
          const org = data.organization;
          setAgentName(org.agent_name || "Asistente");
          setGreeting(org.agent_welcome_message?.es || "");
          setPersonality(org.agent_personality || "");
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!loaded) return;

    setSaved(false);
    const timer = setTimeout(() => {
      if (agentName) {
        setSaving(true);
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
            if (res.ok) setSaved(true);
          })
          .finally(() => setSaving(false));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [agentName, greeting, personality, loaded]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Configura tu agente AI. Este aparecerá como un chat widget en tu landing page
        y ayudará a los visitantes a encontrar propiedades.
      </p>

      <GlassInput
        label="Nombre del agente"
        placeholder="Ej: Ana, Redbot, Asistente Virtual"
        value={agentName}
        onChange={(e) => setAgentName(e.target.value)}
      />

      <GlassTextarea
        label="Mensaje de bienvenida"
        placeholder="Hola, soy Ana, tu asistente inmobiliario virtual. ¿En qué te puedo ayudar?"
        value={greeting}
        onChange={(e) => setGreeting(e.target.value)}
      />

      <GlassTextarea
        label="Personalidad / instrucciones adicionales"
        placeholder="Ej: Sé muy amable y enfocado en propiedades de lujo. Habla en español colombiano informal."
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
      />

      {saving && (
        <p className="text-xs text-text-muted">Guardando...</p>
      )}
      {saved && !saving && (
        <p className="text-xs text-accent-green">
          Configuración del agente guardada.
        </p>
      )}

      <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-text-secondary">
        El agente AI ya viene pre-configurado para búsqueda de propiedades y
        captura de leads. Estas instrucciones adicionales son opcionales y
        permiten personalizar su tono y enfoque.
      </div>
    </div>
  );
}
