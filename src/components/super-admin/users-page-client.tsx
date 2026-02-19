"use client";

import { useState, useEffect, useCallback } from "react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  organization_id: string;
  organizations: { name: string; slug: string } | null;
}

const roleBadgeStyles: Record<string, string> = {
  super_admin: "bg-accent-orange/15 text-accent-orange border-accent-orange/30",
  org_admin: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
  org_agent: "bg-accent-green/15 text-accent-green border-accent-green/30",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Admin",
  org_agent: "Agente",
};

export function UsersPageClient() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
    });
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (isActiveFilter) params.set("is_active", isActiveFilter);

    try {
      const res = await fetch(`/api/super-admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, role, isActiveFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setActionLoading(userId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: `Usuario ${!currentActive ? "activado" : "desactivado"}` });
        fetchUsers();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error" });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Rol actualizado" });
        fetchUsers();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error" });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`¿Eliminar permanentemente a "${userName}"? Esta accion no se puede deshacer.`)) return;

    setActionLoading(userId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Usuario eliminado" });
        fetchUsers();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error al eliminar" });
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Usuarios</h1>
        <p className="text-text-secondary mt-1">
          Gestiona todos los usuarios de la plataforma ({total} total)
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-sm mb-4 ${
            feedback.type === "success"
              ? "bg-accent-green/10 border border-accent-green/20 text-accent-green"
              : "bg-accent-red/10 border border-accent-red/20 text-accent-red"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="flex-1 min-w-[250px] px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 text-sm"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="">Todos los roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="org_admin">Admin</option>
          <option value="org_agent">Agente</option>
        </select>
        <select
          value={isActiveFilter}
          onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-glass">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Organizacion</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Creado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    Cargando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSuperAdmin = user.role === "super_admin";
                  return (
                    <tr key={user.id} className="border-b border-border-glass/50 hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{user.full_name}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {user.organizations?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isSuperAdmin ? (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${roleBadgeStyles[user.role]}`}>
                            {roleLabels[user.role]}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            disabled={actionLoading === user.id}
                            className="px-2 py-0.5 text-xs rounded-lg bg-white/[0.05] border border-border-glass text-text-primary focus:outline-none"
                          >
                            <option value="org_admin">Admin</option>
                            <option value="org_agent">Agente</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${
                          user.is_active
                            ? "bg-accent-green/15 text-accent-green border-accent-green/30"
                            : "bg-accent-red/15 text-accent-red border-accent-red/30"
                        }`}>
                          {user.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {new Date(user.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSuperAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleActive(user.id, user.is_active)}
                              disabled={actionLoading === user.id}
                              className="px-2 py-1 text-xs rounded-lg border border-border-glass text-text-secondary hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
                              title={user.is_active ? "Desactivar" : "Activar"}
                            >
                              {user.is_active ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.full_name)}
                              disabled={actionLoading === user.id}
                              className="px-2 py-1 text-xs rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 disabled:opacity-50 transition-colors"
                              title="Eliminar"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
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
