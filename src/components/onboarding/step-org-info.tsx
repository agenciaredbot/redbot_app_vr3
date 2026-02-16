"use client";

import { useState, useEffect } from "react";
import { GlassInput } from "@/components/ui/glass-input";

export function StepOrgInfo() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load current org data
  useEffect(() => {
    fetch("/api/organizations")
      .then((res) => res.json())
      .then((data) => {
        if (data.organization) {
          const org = data.organization;
          setName(org.name || "");
          setCity(org.city || "");
          setPhone(org.phone || "");
          setEmail(org.email || "");
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
      if (name) {
        setSaving(true);
        fetch("/api/organizations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, city, phone, email }),
        })
          .then((res) => {
            if (res.ok) setSaved(true);
          })
          .finally(() => setSaving(false));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [name, city, phone, email, loaded]);

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
      {saving && (
        <p className="text-xs text-text-muted">Guardando...</p>
      )}
      {saved && !saving && (
        <p className="text-xs text-accent-green">
          Información guardada. Puedes continuar al siguiente paso.
        </p>
      )}
    </div>
  );
}
