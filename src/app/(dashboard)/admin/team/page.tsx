import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamPageClient } from "@/components/team/team-page-client";

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/login");

  const canManageTeam = ["super_admin", "org_admin"].includes(profile.role);

  // Fetch team members
  const { data: members } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  // Fetch pending invitations
  const { data: pendingInvitations } = await supabase
    .from("invitations")
    .select("id, token, role, expires_at, created_at")
    .eq("organization_id", profile.organization_id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  // Fetch org limits
  const { data: org } = await supabase
    .from("organizations")
    .select("max_agents")
    .eq("id", profile.organization_id)
    .single();

  const maxAgents = org?.max_agents ?? 2;

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Equipo</h1>
        <p className="text-text-secondary mt-1">
          Gestiona los miembros de tu organización.
        </p>
      </div>

      <TeamPageClient
        members={members || []}
        pendingInvitations={pendingInvitations || []}
        limits={{
          current: members?.length ?? 0,
          max: maxAgents,
        }}
        currentUserId={user.id}
        canManageTeam={canManageTeam}
      />
    </div>
  );
}
