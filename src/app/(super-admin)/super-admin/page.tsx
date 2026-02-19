import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/super-admin/stat-card";

export const metadata = {
  title: "Super Admin | Redbot",
};

export default async function SuperAdminDashboard() {
  const supabase = createAdminClient();

  // Fetch all metrics in parallel
  const [
    orgsResult,
    activeOrgsResult,
    usersResult,
    propertiesResult,
    publishedPropsResult,
    leadsResult,
    conversationsResult,
    trialOrgsResult,
    newOrgsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("organizations").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("organizations").select("*", { count: "exact", head: true }).eq("plan_status", "trialing"),
    supabase.from("organizations").select("*", { count: "exact", head: true }).gte(
      "created_at",
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    ),
  ]);

  const totalOrgs = orgsResult.count || 0;
  const activeOrgs = activeOrgsResult.count || 0;
  const totalUsers = usersResult.count || 0;
  const totalProperties = propertiesResult.count || 0;
  const publishedProperties = publishedPropsResult.count || 0;
  const totalLeads = leadsResult.count || 0;
  const totalConversations = conversationsResult.count || 0;
  const trialOrgs = trialOrgsResult.count || 0;
  const newOrgsThisMonth = newOrgsResult.count || 0;

  // Icons as inline SVG paths
  const buildingIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0H21" />
    </svg>
  );
  const checkIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const usersIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
  const homeIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  );
  const leadsIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
  const chatIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
  const trendIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
  const clockIcon = (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Panel General</h1>
        <p className="text-text-secondary mt-1">
          Vista general de la plataforma Redbot
        </p>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total Organizaciones"
          value={totalOrgs}
          icon={buildingIcon}
          bgClass="bg-accent-blue/10"
          textClass="text-accent-blue"
        />
        <StatCard
          label="Organizaciones Activas"
          value={activeOrgs}
          icon={checkIcon}
          bgClass="bg-accent-green/10"
          textClass="text-accent-green"
          subtitle={`${totalOrgs - activeOrgs} inactivas`}
        />
        <StatCard
          label="Total Usuarios"
          value={totalUsers}
          icon={usersIcon}
          bgClass="bg-accent-purple/10"
          textClass="text-accent-purple"
        />
        <StatCard
          label="Total Propiedades"
          value={totalProperties}
          icon={homeIcon}
          bgClass="bg-accent-cyan/10"
          textClass="text-accent-cyan"
          subtitle={`${publishedProperties} publicadas`}
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={totalLeads}
          icon={leadsIcon}
          bgClass="bg-accent-orange/10"
          textClass="text-accent-orange"
        />
        <StatCard
          label="Conversaciones"
          value={totalConversations}
          icon={chatIcon}
          bgClass="bg-accent-purple/10"
          textClass="text-accent-purple"
        />
        <StatCard
          label="Nuevas Orgs (este mes)"
          value={newOrgsThisMonth}
          icon={trendIcon}
          bgClass="bg-accent-green/10"
          textClass="text-accent-green"
        />
        <StatCard
          label="Orgs en Trial"
          value={trialOrgs}
          icon={clockIcon}
          bgClass="bg-accent-orange/10"
          textClass="text-accent-orange"
        />
      </div>
    </div>
  );
}
