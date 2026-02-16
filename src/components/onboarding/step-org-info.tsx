"use client";

import { useState, useEffect } from "react";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";

export function StepOrgInfo() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // This would update the organization via an API route
    // For now we'll just show saved state
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Esta información se mostrará en tu landing page y será usada por el agente AI.
      </p>
      <GlassInput
        label="Nombre de la empresa"
        placeholder="Inmobiliaria Ejemplo"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassInput
          label="Ciudad"
          placeholder="Bogotá"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <GlassInput
          label="Teléfono"
          placeholder="+57 300 000 0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <GlassInput
        label="Email de contacto"
        placeholder="contacto@miempresa.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {saved && (
        <p className="text-xs text-accent-green">
          Información guardada. Puedes continuar al siguiente paso.
        </p>
      )}
    </div>
  );
}
