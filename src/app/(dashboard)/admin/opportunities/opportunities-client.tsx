"use client";

import { useState } from "react";
import { GlassTabs } from "@/components/ui/glass-tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { OpportunitySearch } from "@/components/opportunities/opportunity-search";
import { OpportunityList } from "@/components/opportunities/opportunity-list";
import { OpportunityDetailDialog } from "@/components/opportunities/opportunity-detail-dialog";
import { RequestShareDialog } from "@/components/opportunities/request-share-dialog";
import { ReverseRequestForm } from "@/components/opportunities/reverse-request-form";
import { TrustedPartners } from "@/components/opportunities/trusted-partners";
import { OpportunityStats } from "@/components/opportunities/opportunity-stats";
import type { PlanTier } from "@/lib/supabase/types";

interface OpportunitiesClientProps {
  organizationId: string;
  canUseActiveFeatures: boolean;
  planTier: PlanTier;
}

export function OpportunitiesClient({
  organizationId,
  canUseActiveFeatures,
  planTier,
}: OpportunitiesClientProps) {
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRequestShare = (property: any) => {
    setSelectedProperty(property);
    setShowRequestDialog(true);
  };

  const handleViewDetail = (opportunity: any) => {
    setSelectedOpportunity(opportunity);
    setShowDetailDialog(true);
  };

  const refresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Upgrade prompt for Basic users
  const UpgradePrompt = () => (
    <GlassCard padding="lg">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Función exclusiva de Power y Omni
        </h3>
        <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
          Busca propiedades en la red, crea solicitudes de compartir y gestiona tu red de socios de confianza.
          Actualiza tu plan para acceder a todas las funcionalidades.
        </p>
        <GlassButton variant="primary" onClick={() => window.location.href = "/admin/billing"}>
          Ver Planes
        </GlassButton>
      </div>
    </GlassCard>
  );

  const tabs = [
    {
      id: "search",
      label: "Buscar",
      content: canUseActiveFeatures ? (
        <OpportunitySearch onRequestShare={handleRequestShare} />
      ) : (
        <UpgradePrompt />
      ),
    },
    {
      id: "my-opportunities",
      label: "Mis Oportunidades",
      content: (
        <OpportunityList
          key={`list-${refreshKey}`}
          organizationId={organizationId}
          onViewDetail={handleViewDetail}
        />
      ),
    },
    {
      id: "market-requests",
      label: "Solicitudes del Mercado",
      content: (
        <ReverseRequestForm
          key={`requests-${refreshKey}`}
          canCreate={canUseActiveFeatures}
        />
      ),
    },
    {
      id: "trusted-network",
      label: "Red de Confianza",
      content: canUseActiveFeatures ? (
        <TrustedPartners key={`partners-${refreshKey}`} />
      ) : (
        <UpgradePrompt />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Oportunidades</h1>
        <p className="text-sm text-text-muted mt-1">
          Red colaborativa de propiedades entre inmobiliarias
        </p>
      </div>

      {/* Stats */}
      <OpportunityStats />

      {/* Tabs */}
      <GlassTabs
        tabs={tabs}
        defaultTab={canUseActiveFeatures ? "search" : "my-opportunities"}
      />

      {/* Dialogs */}
      <RequestShareDialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        property={selectedProperty}
        onSuccess={refresh}
      />

      <OpportunityDetailDialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        opportunity={selectedOpportunity}
        organizationId={organizationId}
        onAction={refresh}
      />
    </div>
  );
}
