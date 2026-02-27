"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { GlassInput } from "@/components/ui/glass-input";

interface Partner {
  id: string;
  org_id: string;
  partner_org_id: string;
  auto_approve: boolean;
  default_commission: number | null;
  created_at: string;
  partner_org?: { name: string; slug: string };
}

interface TrustedByEntry {
  id: string;
  org_id: string;
  partner_org_id: string;
  auto_approve: boolean;
  default_commission: number | null;
  created_at: string;
  org?: { name: string; slug: string };
}

export function TrustedPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [trustedBy, setTrustedBy] = useState<TrustedByEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/opportunities/partners");
      const data = await res.json();
      if (res.ok) {
        setPartners(data.partners || []);
        setTrustedBy(data.trusted_by || []);
      }
    } catch (err) {
      console.error("Error fetching partners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Search organizations for adding as partner
  const searchOrgs = useCallback(async () => {
    if (!orgSearch.trim() || orgSearch.trim().length < 2) return;
    setSearching(true);
    try {
      // Use the search endpoint indirectly — search for any property and extract unique orgs
      const res = await fetch(`/api/opportunities/search?search=${encodeURIComponent(orgSearch)}&limit=50`);
      const data = await res.json();
      if (res.ok && data.properties) {
        const orgsMap = new Map<string, { id: string; name: string; slug: string }>();
        for (const p of data.properties) {
          if (!orgsMap.has(p.organization_id)) {
            orgsMap.set(p.organization_id, {
              id: p.organization_id,
              name: p.org_name,
              slug: p.org_slug,
            });
          }
        }
        setSearchResults(Array.from(orgsMap.values()));
      }
    } catch (err) {
      console.error("Error searching orgs:", err);
    } finally {
      setSearching(false);
    }
  }, [orgSearch]);

  const addPartner = async (partnerOrgId: string) => {
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/opportunities/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_org_id: partnerOrgId,
          auto_approve: false,
          default_commission: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al agregar socio");
        return;
      }
      setShowAddDialog(false);
      setOrgSearch("");
      setSearchResults([]);
      fetchPartners();
    } catch {
      setError("Error de conexión");
    } finally {
      setAdding(false);
    }
  };

  const toggleAutoApprove = async (partner: Partner) => {
    try {
      const res = await fetch("/api/opportunities/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_org_id: partner.partner_org_id,
          auto_approve: !partner.auto_approve,
          default_commission: partner.default_commission,
        }),
      });
      if (res.ok) {
        fetchPartners();
      }
    } catch (err) {
      console.error("Error toggling auto-approve:", err);
    }
  };

  const removePartner = async (partnerId: string) => {
    try {
      const res = await fetch(`/api/opportunities/partners?id=${partnerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPartners();
      }
    } catch (err) {
      console.error("Error removing partner:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <GlassCard padding="lg">
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-text-muted mt-2 text-sm">Cargando red de confianza...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* My trusted partners */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Mis Socios de Confianza</h3>
          <GlassButton variant="primary" size="sm" onClick={() => setShowAddDialog(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar Socio
          </GlassButton>
        </div>

        {partners.length === 0 ? (
          <GlassCard padding="md">
            <p className="text-sm text-text-muted text-center py-4">
              No tienes socios de confianza. Agrega inmobiliarias de confianza para auto-aprobar sus solicitudes.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {partners.map((partner) => (
              <GlassCard key={partner.id} padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {partner.partner_org?.name || "Desconocida"}
                    </p>
                    <p className="text-xs text-text-muted">
                      Agregado: {formatDate(partner.created_at)}
                      {partner.default_commission && ` &bull; Comisión: ${partner.default_commission}%`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAutoApprove(partner)}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${partner.auto_approve ? "bg-accent-blue" : "bg-white/[0.1]"}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${partner.auto_approve ? "translate-x-6" : "translate-x-1"}
                        `}
                      />
                    </button>
                    <span className="text-xs text-text-muted w-20">
                      {partner.auto_approve ? "Auto-aprobar" : "Manual"}
                    </span>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => removePartner(partner.id)}
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Trusted by others */}
      {trustedBy.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Confían en Ti</h3>
          <div className="space-y-2">
            {trustedBy.map((entry) => (
              <GlassCard key={entry.id} padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {entry.org?.name || "Desconocida"}
                    </p>
                    <p className="text-xs text-text-muted">
                      Desde: {formatDate(entry.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GlassBadge color={entry.auto_approve ? "#10B981" : "#6B7280"} size="sm">
                      {entry.auto_approve ? "Auto-aprobado" : "Manual"}
                    </GlassBadge>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Add partner dialog */}
      <GlassDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setOrgSearch("");
          setSearchResults([]);
          setError("");
        }}
        title="Agregar Socio de Confianza"
        description="Busca una inmobiliaria en la red para agregarla como socio de confianza. Puedes activar la auto-aprobación después."
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <GlassInput
              placeholder="Buscar inmobiliaria..."
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              className="flex-1"
            />
            <GlassButton variant="primary" onClick={searchOrgs} loading={searching}>
              Buscar
            </GlassButton>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-border-glass"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{org.name}</p>
                    <p className="text-xs text-text-muted">{org.slug}</p>
                  </div>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => addPartner(org.id)}
                    loading={adding}
                  >
                    Agregar
                  </GlassButton>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && orgSearch.length >= 2 && !searching && (
            <p className="text-sm text-text-muted text-center py-3">
              No se encontraron inmobiliarias. Intenta con otro término.
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </GlassDialog>
    </div>
  );
}
