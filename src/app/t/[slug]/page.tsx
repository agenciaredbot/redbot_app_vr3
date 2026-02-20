import { createAdminClient } from "@/lib/supabase/admin";
import { PropertyGrid } from "@/components/properties/property-grid";
import { PropertyFilters } from "@/components/properties/property-filters";
import { GlassCard } from "@/components/ui/glass-card";
import { InlineChatWrapper } from "@/components/chat/inline-chat-wrapper";
import { getI18nText } from "@/lib/utils/format";

export default async function TenantHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  const supabase = createAdminClient();

  // Get org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, agent_name, agent_welcome_message")
    .eq("slug", slug)
    .single();

  if (!org) return null;

  // Build query
  let query = supabase
    .from("properties")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (filters.type) {
    query = query.eq("property_type", filters.type);
  }
  if (filters.business) {
    query = query.eq("business_type", filters.business);
  }
  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }
  if (filters.bedrooms) {
    query = query.gte("bedrooms", parseInt(filters.bedrooms));
  }
  if (filters.price_min) {
    query = query.gte("sale_price", parseInt(filters.price_min));
  }
  if (filters.price_max) {
    query = query.lte("sale_price", parseInt(filters.price_max));
  }
  if (filters.search) {
    query = query.textSearch("fts", filters.search, {
      type: "websearch",
      config: "spanish",
    });
  }

  const { data: properties } = await query;

  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Encuentra tu{" "}
            <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              hogar ideal
            </span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Explora nuestra selección de propiedades o chatea con{" "}
            <span className="text-accent-cyan font-medium">
              {org.agent_name}
            </span>
            , nuestro agente AI, para una búsqueda personalizada.
          </p>
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <GlassCard padding="md" className="mb-4">
          <PropertyFilters currentFilters={filters} />
        </GlassCard>

        {/* AI Agent inline chat */}
        <div className="mb-8">
          <InlineChatWrapper
            organizationSlug={org.slug}
            agentName={org.agent_name}
            welcomeMessage={getI18nText(org.agent_welcome_message) || undefined}
          />
        </div>

        {!properties || properties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">
              No se encontraron propiedades con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <PropertyGrid properties={properties} slug={slug} />
        )}
      </section>
    </div>
  );
}
