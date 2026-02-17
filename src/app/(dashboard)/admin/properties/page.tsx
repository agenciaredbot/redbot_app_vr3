import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { PropertyActionsBar } from "@/components/properties/property-actions-bar";
import { PropertiesTable } from "@/components/properties/properties-table";

export const metadata = {
  title: "Propiedades",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get authenticated user + org context
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    redirect("/login");
  }

  const organizationId = profile.organization_id;
  const canBulkAction = ["super_admin", "org_admin"].includes(profile.role);

  const page = parseInt(params.page || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.search) {
    query = query.textSearch("fts", params.search, {
      type: "websearch",
      config: "spanish",
    });
  }

  const { data: properties, count } = await query;
  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Propiedades</h1>
        <PropertyActionsBar />
      </div>

      <GlassCard padding="none">
        {!properties || properties.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"
              />
            </svg>
            <p className="text-text-secondary mb-4">
              No hay propiedades registradas
            </p>
            <Link href="/admin/properties/new">
              <GlassButton size="sm">Agregar primera propiedad</GlassButton>
            </Link>
          </div>
        ) : (
          <>
            <PropertiesTable
              properties={properties}
              canBulkAction={canBulkAction}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-glass">
                <p className="text-sm text-text-muted">
                  {count} propiedades — Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/admin/properties?page=${page - 1}`}>
                      <GlassButton variant="secondary" size="sm">
                        Anterior
                      </GlassButton>
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/admin/properties?page=${page + 1}`}>
                      <GlassButton variant="secondary" size="sm">
                        Siguiente
                      </GlassButton>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}
