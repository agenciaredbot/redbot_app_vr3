"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";
import type { PortalConnection } from "@/lib/portals/types";

interface PropertyPortalsProps {
  propertyId: string;
}

/**
 * Shows Proppit syndication status on the property edit page.
 * Read-only info — all published+disponible properties are
 * automatically included in the Proppit XML feed.
 */
export function PropertyPortals({ propertyId: _propertyId }: PropertyPortalsProps) {
  const [connection, setConnection] = useState<PortalConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/portals");
      if (res.status === 403) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const connections: PortalConnection[] = data.connections || [];
      const proppit = connections.find(
        (c) => c.portal_slug === "proppit" && c.is_active
      );
      setConnection(proppit || null);
    } catch {
      // Silently fail — portal section is optional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Don't render if no active Proppit connection
  if (loading || !connection) return null;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        <h3 className="text-sm font-semibold text-text-primary">
          Portales externos
        </h3>
        <GlassBadge color="#10B981" size="sm">Proppit activo</GlassBadge>
      </div>

      <p className="text-xs text-text-muted">
        Esta propiedad aparece automáticamente en Properati, Trovit, Mitula y otros
        portales a través de Proppit. La sincronización ocurre cada 24-48 horas.
      </p>
    </GlassCard>
  );
}
