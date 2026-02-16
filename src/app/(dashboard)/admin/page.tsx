import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui/glass-card";

export const metadata = {
  title: "Panel de administración",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch basic stats
  const { count: propertiesCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  const { count: newLeadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("pipeline_stage", "nuevo");

  const { count: conversationsCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const stats = [
    {
      label: "Total propiedades",
      value: propertiesCount || 0,
      icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21",
      color: "accent-blue",
    },
    {
      label: "Total leads",
      value: leadsCount || 0,
      icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952",
      color: "accent-purple",
    },
    {
      label: "Leads nuevos",
      value: newLeadsCount || 0,
      icon: "M12 4.5v15m7.5-7.5h-15",
      color: "accent-green",
    },
    {
      label: "Conversaciones activas",
      value: conversationsCount || 0,
      icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
      color: "accent-cyan",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        Panel de administración
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label} variant="hover" padding="md">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}
              >
                <svg
                  className={`w-6 h-6 text-${stat.color}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={stat.icon}
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-sm text-text-secondary">{stat.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
