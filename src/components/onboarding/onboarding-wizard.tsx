"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { TenantLinksBlock } from "@/components/ui/tenant-links-block";
import { StepOrgInfo } from "./step-org-info";
import { StepImportProperties } from "./step-import-properties";
import { StepAiConfig } from "./step-ai-config";

const STEPS = [
  { title: "Tu empresa", description: "Información básica de tu inmobiliaria" },
  { title: "Propiedades", description: "Importa o crea tus propiedades" },
  { title: "Agente AI", description: "Configura tu asistente virtual" },
  { title: "¡Listo!", description: "Tu inmobiliaria está configurada" },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const router = useRouter();

  // Fetch org slug when reaching the final step
  useEffect(() => {
    if (currentStep === 3 && !orgSlug) {
      fetch("/api/organizations")
        .then((res) => res.json())
        .then((data) => {
          if (data.organization?.slug) {
            setOrgSlug(data.organization.slug);
          }
        })
        .catch(() => {});
    }
  }, [currentStep, orgSlug]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding complete (final step)
      fetch("/api/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_completed: true }),
      }).then(() => {
        router.push("/admin");
        router.refresh();
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => (
          <div key={step.title} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                idx <= currentStep
                  ? "bg-gradient-to-r from-accent-blue to-accent-purple text-white"
                  : "bg-white/[0.05] text-text-muted"
              }`}
            >
              {idx < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 ${
                  idx < currentStep ? "bg-accent-blue" : "bg-border-glass"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {STEPS[currentStep].title}
        </h1>
        <p className="text-text-secondary mt-1">
          {STEPS[currentStep].description}
        </p>
      </div>

      {/* Step content */}
      <GlassCard padding="lg">
        {currentStep === 0 && <StepOrgInfo />}
        {currentStep === 1 && <StepImportProperties />}
        {currentStep === 2 && <StepAiConfig />}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-green/10 mb-4">
                <svg className="w-8 h-8 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm">
                Guarda estos enlaces. Tu equipo puede acceder desde tu subdominio personalizado.
              </p>
            </div>

            {orgSlug ? (
              <TenantLinksBlock slug={orgSlug} />
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-text-muted">Cargando tus enlaces...</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-text-secondary">
              Puedes encontrar estos enlaces en cualquier momento en{" "}
              <span className="font-medium text-text-primary">Configuración → Tus enlaces</span>.
            </div>
          </div>
        )}
      </GlassCard>

      {/* Navigation */}
      <div className="flex justify-between">
        <GlassButton
          variant="secondary"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Atrás
        </GlassButton>
        <GlassButton onClick={handleNext}>
          {currentStep === STEPS.length - 1 ? "Ir al panel" : "Siguiente"}
        </GlassButton>
      </div>
    </div>
  );
}
