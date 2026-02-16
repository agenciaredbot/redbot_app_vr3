"use client";

import { useState } from "react";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";

export function StepAiConfig() {
  const [agentName, setAgentName] = useState("Asistente");
  const [greeting, setGreeting] = useState("");
  const [personality, setPersonality] = useState("");

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

      <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-text-secondary">
        El agente AI ya viene pre-configurado para búsqueda de propiedades y
        captura de leads. Estas instrucciones adicionales son opcionales y
        permiten personalizar su tono y enfoque.
      </div>
    </div>
  );
}
