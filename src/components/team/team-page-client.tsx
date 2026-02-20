"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { GlassSelect } from "@/components/ui/glass-select";

interface Member {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface PendingInvitation {
  id: string;
  token: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface TeamPageClientProps {
  members: Member[];
  pendingInvitations: PendingInvitation[];
  limits: { current: number; max: number };
  currentUserId: string;
  canManageTeam: boolean;
}

const ROLE_OPTIONS = [
  { value: "org_admin", label: "Administrador" },
  { value: "org_agent", label: "Agente" },
];

function formatRole(role: string): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "org_admin":
      return "Administrador";
    case "org_agent":
      return "Agente";
    default:
      return role;
  }
}

function roleColor(role: string): string {
  switch (role) {
    case "super_admin":
      return "#F59E0B";
    case "org_admin":
      return "#3B82F6";
    case "org_agent":
      return "#10B981";
    default:
      return "#6B7280";
  }
}

function timeUntil(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Expirada";
  if (days === 1) return "1 día";
  return `${days} días`;
}

export function TeamPageClient({
  members: initialMembers,
  pendingInvitations: initialInvitations,
  limits: initialLimits,
  currentUserId,
  canManageTeam,
}: TeamPageClientProps) {
  const router = useRouter();

  // State
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvitations, setPendingInvitations] = useState(initialInvitations);
  const [limits, setLimits] = useState(initialLimits);

  // Dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState("org_agent");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [changeRoleMember, setChangeRoleMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  const [deactivateMember, setDeactivateMember] = useState<Member | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss feedback
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Refresh data from server
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setPendingInvitations(data.pendingInvitations);
        setLimits(data.limits);
      }
    } catch {
      // silently fail refresh
    }
  }, []);

  // Generate invitation
  const handleInvite = useCallback(async () => {
    setInviteLoading(true);
    setInviteUrl(null);
    setCopied(false);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", message: data.error });
        setInviteOpen(false);
      } else {
        setInviteUrl(data.inviteUrl);
        await refreshData();
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexión" });
      setInviteOpen(false);
    } finally {
      setInviteLoading(false);
    }
  }, [inviteRole, refreshData]);

  // Copy invite URL
  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = inviteUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteUrl]);

  // Change role
  const handleChangeRole = useCallback(async () => {
    if (!changeRoleMember || !newRole) return;
    setRoleLoading(true);

    try {
      const res = await fetch(`/api/team/${changeRoleMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", message: data.error });
      } else {
        setFeedback({
          type: "success",
          message: `Rol de ${changeRoleMember.full_name} actualizado a ${formatRole(newRole)}`,
        });
        await refreshData();
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexión" });
    } finally {
      setRoleLoading(false);
      setChangeRoleMember(null);
      setNewRole("");
    }
  }, [changeRoleMember, newRole, refreshData]);

  // Deactivate member
  const handleDeactivate = useCallback(async () => {
    if (!deactivateMember) return;
    setDeactivateLoading(true);

    try {
      const res = await fetch(`/api/team/${deactivateMember.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", message: data.error });
      } else {
        setFeedback({
          type: "success",
          message: `${deactivateMember.full_name} ha sido desactivado`,
        });
        await refreshData();
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexión" });
    } finally {
      setDeactivateLoading(false);
      setDeactivateMember(null);
    }
  }, [deactivateMember, refreshData]);

  // Cancel invitation
  const handleCancelInvitation = useCallback(
    async (invitationId: string) => {
      // We don't have a dedicated cancel endpoint, so we'll just mark it
      // For now, we delete it via the API. Let's use a simple approach.
      try {
        const res = await fetch("/api/team/invitations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId }),
        });

        if (res.ok) {
          setFeedback({ type: "success", message: "Invitación cancelada" });
          await refreshData();
        }
      } catch {
        // If endpoint doesn't exist yet, just refresh
        await refreshData();
      }
    },
    [refreshData]
  );

  const limitDisplay =
    limits.max === -1
      ? `${limits.current} miembros (ilimitado)`
      : `${limits.current} / ${limits.max} miembros`;

  const isAtAgentLimit =
    limits.max !== -1 && limits.current >= limits.max;

  return (
    <>
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-accent-green/[0.08] border-accent-green/20 text-accent-green"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {feedback.type === "success" ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            )}
          </svg>
          {feedback.message}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GlassBadge color="#3B82F6" size="md">
            {limitDisplay}
          </GlassBadge>
        </div>
        {canManageTeam && (
          <GlassButton
            size="sm"
            disabled={isAtAgentLimit}
            title={isAtAgentLimit ? `Límite de miembros alcanzado (${limits.current}/${limits.max}). Actualiza tu plan.` : undefined}
            onClick={() => {
              setInviteOpen(true);
              setInviteUrl(null);
              setCopied(false);
              setInviteRole("org_agent");
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
              />
            </svg>
            {isAtAgentLimit ? "Límite alcanzado" : "Invitar miembro"}
          </GlassButton>
        )}
      </div>

      {/* Members table */}
      <GlassCard padding="none">
        <div className="px-6 py-4 border-b border-border-glass">
          <h3 className="text-sm font-semibold text-text-primary">
            Miembros del equipo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-glass">
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                  Rol
                </th>
                {canManageTeam && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-glass">
              {members.map((member) => {
                const isMe = member.id === currentUserId;
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-text-primary">
                        {member.full_name}
                        {isMe && (
                          <span className="ml-2 text-xs text-text-muted">
                            (Tú)
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary">
                        {member.email}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <GlassBadge color={roleColor(member.role)}>
                        {formatRole(member.role)}
                      </GlassBadge>
                    </td>
                    {canManageTeam && (
                      <td className="px-6 py-4 text-right">
                        {!isMe && member.role !== "super_admin" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setChangeRoleMember(member);
                                setNewRole(
                                  member.role === "org_admin"
                                    ? "org_agent"
                                    : "org_admin"
                                );
                              }}
                              className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                            >
                              Cambiar rol
                            </button>
                            <span className="text-border-glass">·</span>
                            <button
                              onClick={() => setDeactivateMember(member)}
                              className="text-xs text-accent-red hover:text-accent-red/80 transition-colors"
                            >
                              Desactivar
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Pending invitations */}
      {canManageTeam && pendingInvitations.length > 0 && (
        <GlassCard padding="none" className="mt-6">
          <div className="px-6 py-4 border-b border-border-glass">
            <h3 className="text-sm font-semibold text-text-primary">
              Invitaciones pendientes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-glass">
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Expira en
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-glass">
                {pendingInvitations.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <GlassBadge color={roleColor(inv.role)}>
                        {formatRole(inv.role)}
                      </GlassBadge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary">
                        {timeUntil(inv.expires_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            const appUrl =
                              process.env.NEXT_PUBLIC_APP_URL ||
                              window.location.origin;
                            const url = `${appUrl}/join/${inv.token}`;
                            try {
                              await navigator.clipboard.writeText(url);
                              setFeedback({
                                type: "success",
                                message: "Link copiado al portapapeles",
                              });
                            } catch {
                              // fallback
                            }
                          }}
                          className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                        >
                          Copiar link
                        </button>
                        <span className="text-border-glass">·</span>
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs text-accent-red hover:text-accent-red/80 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Invite dialog */}
      <GlassDialog
        open={inviteOpen}
        onClose={() => {
          if (!inviteLoading) {
            setInviteOpen(false);
            setInviteUrl(null);
          }
        }}
        title="Invitar miembro al equipo"
        description={
          inviteUrl
            ? "Comparte este link con el nuevo miembro. Expira en 7 días."
            : "Elige el rol para el nuevo miembro y genera un link de invitación."
        }
        actions={
          inviteUrl ? (
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setInviteOpen(false);
                setInviteUrl(null);
              }}
            >
              Cerrar
            </GlassButton>
          ) : (
            <>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setInviteOpen(false)}
                disabled={inviteLoading}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                size="sm"
                onClick={handleInvite}
                loading={inviteLoading}
              >
                Generar link
              </GlassButton>
            </>
          )
        }
      >
        {inviteUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.05] border border-border-glass">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-text-primary outline-none truncate"
              />
              <GlassButton size="sm" variant="secondary" onClick={handleCopy}>
                {copied ? "Copiado!" : "Copiar"}
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <GlassSelect
              label="Rol"
              options={ROLE_OPTIONS}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            />
          </div>
        )}
      </GlassDialog>

      {/* Change role dialog */}
      {changeRoleMember && (
        <GlassDialog
          open={changeRoleMember !== null}
          onClose={() => !roleLoading && setChangeRoleMember(null)}
          title={`Cambiar rol de ${changeRoleMember.full_name}`}
          description="Selecciona el nuevo rol para este miembro."
          actions={
            <>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setChangeRoleMember(null)}
                disabled={roleLoading}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                size="sm"
                onClick={handleChangeRole}
                loading={roleLoading}
              >
                Cambiar rol
              </GlassButton>
            </>
          }
        >
          <GlassSelect
            label="Nuevo rol"
            options={ROLE_OPTIONS}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
        </GlassDialog>
      )}

      {/* Deactivate dialog */}
      {deactivateMember && (
        <GlassDialog
          open={deactivateMember !== null}
          onClose={() => !deactivateLoading && setDeactivateMember(null)}
          title={`Desactivar a ${deactivateMember.full_name}`}
          description="Esta acción impedirá que el miembro acceda al dashboard."
          actions={
            <>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setDeactivateMember(null)}
                disabled={deactivateLoading}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={handleDeactivate}
                loading={deactivateLoading}
              >
                Desactivar
              </GlassButton>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            {deactivateMember.full_name} ({deactivateMember.email}) ya no podrá
            iniciar sesión ni acceder al dashboard de la organización.
          </p>
        </GlassDialog>
      )}
    </>
  );
}
