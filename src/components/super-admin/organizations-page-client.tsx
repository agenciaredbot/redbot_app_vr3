"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  plan_tier: string;
  plan_status: string;
  is_active: boolean;
  created_at: string;
  _memberCount: number;
  _propertyCount: number;
  _leadCount: number;
}

const planBadgeStyles: Record<string, string> = {
  basic: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
  power: "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
  omni: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30",
};

const statusBadgeStyles: Record<string, string> = {
  active: "bg-accent-green/15 text-accent-green border-accent-green/30",
  trialing: "bg-accent-orange/15 text-accent-orange border-accent-orange/30",
  canceled: "bg-accent-red/15 text-accent-red border-accent-red/30",
  past_due: "bg-accent-red/15 text-accent-red border-accent-red/30",
  unpaid: "bg-accent-red/15 text-accent-red border-accent-red/30",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  trialing: "Trial",
  canceled: "Cancelado",
  past_due: "Vencido",
  unpaid: "Sin pago",
};

export function OrganizationsPageClient() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [planTier, setPlanTier] = useState("");
  const [planStatus, setPlanStatus] = useState("");

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
    });
    if (search) params.set("search", search);
    if (planTier) params.set("plan_tier", planTier);
    if (planStatus) params.set("plan_status", planStatus);

    try {
      const res = await fetch(`/api/super-admin/organizations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, planTier, planStatus]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Organizaciones</h1>
        <p className="text-text-secondary mt-1">
          Gestiona todas las organizaciones de la plataforma ({total} total)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre, slug o email..."
          className="flex-1 min-w-[250px] px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 text-sm"
        />
        <select
          value={planTier}
          onChange={(e) => { setPlanTier(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="">Todos los planes</option>
          <option value="basic">Basic</option>
          <option value="power">Power</option>
          <option value="omni">Omni</option>
        </select>
        <select
          value={planStatus}
          onChange={(e) => { setPlanStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="trialing">Trial</option>
          <option value="canceled">Cancelado</option>
          <option value="past_due">Vencido</option>
          <option value="unpaid">Sin pago</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-glass">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Miembros</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Props</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Leads</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    Cargando...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    No se encontraron organizaciones
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => router.push(`/super-admin/organizations/${org.id}`)}
                    className="border-b border-border-glass/50 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{org.name}</span>
                        {!org.is_active && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-accent-red/15 text-accent-red border border-accent-red/30">
                            Inactiva
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary font-mono">{org.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${planBadgeStyles[org.plan_tier] || "bg-white/10 text-text-muted border-border-glass"}`}>
                        {org.plan_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusBadgeStyles[org.plan_status] || "bg-white/10 text-text-muted border-border-glass"}`}>
                        {statusLabels[org.plan_status] || org.plan_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-center">{org._memberCount}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-center">{org._propertyCount}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-center">{org._leadCount}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(org.created_at).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-glass">
            <p className="text-sm text-text-muted">
              Pagina {page} de {totalPages} ({total} resultados)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-glass text-text-secondary hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-glass text-text-secondary hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
