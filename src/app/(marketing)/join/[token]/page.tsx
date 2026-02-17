import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { JoinForm } from "@/components/auth/join-form";
import { GlassCard } from "@/components/ui/glass-card";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;

  // Validate invitation using admin client (public page, no auth)
  const supabase = createAdminClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, role, status, expires_at, organization_id")
    .eq("token", token)
    .single();

  // Check if invitation is valid
  const isInvalid =
    !invitation ||
    invitation.status !== "pending" ||
    new Date(invitation.expires_at) < new Date();

  if (isInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">
            Invitación no válida
          </h1>
          <p className="text-text-secondary text-sm mb-6">
            {!invitation
              ? "Esta invitación no existe o ha sido eliminada."
              : invitation.status !== "pending"
              ? "Esta invitación ya fue utilizada."
              : "Esta invitación ha expirado."}
          </p>
          <Link
            href="/register"
            className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
          >
            Registrarme con una nueva cuenta
          </Link>
        </GlassCard>
      </div>
    );
  }

  // Get organization name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .single();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full">
        <JoinForm
          token={token}
          organizationName={org?.name || "Organización"}
          role={invitation.role}
        />
      </GlassCard>
    </div>
  );
}
