import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { PropertyDetail } from "@/components/properties/property-detail";
import { PropertyContextSetter } from "@/components/chat/property-context-setter";
import { InlineChatWrapper } from "@/components/chat/inline-chat-wrapper";
import { getI18nText, formatPrice, formatPropertyType } from "@/lib/utils/format";

interface Props {
  params: Promise<{ slug: string; propertySlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, propertySlug } = await params;
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!org) return {};

  const { data: property } = await supabase
    .from("properties")
    .select("title, description, images, property_type, city")
    .eq("organization_id", org.id)
    .eq("slug", propertySlug)
    .eq("is_published", true)
    .single();

  if (!property) return {};

  const title = getI18nText(property.title);
  const description = getI18nText(property.description) || `${title} en ${property.city || "Colombia"}`;
  const images = (property.images as string[]) || [];

  return {
    title: `${title} | ${org.name}`,
    description,
    openGraph: {
      title,
      description,
      images: images[0] ? [images[0]] : [],
    },
  };
}

export default async function PropertyDetailPage({ params }: Props) {
  const { slug, propertySlug } = await params;
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, agent_name, agent_welcome_message")
    .eq("slug", slug)
    .single();

  if (!org) notFound();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", propertySlug)
    .eq("is_published", true)
    .single();

  if (!property) notFound();

  const title = getI18nText(property.title);
  const price =
    property.business_type === "arriendo"
      ? formatPrice(property.rent_price, property.currency) + "/mes"
      : formatPrice(property.sale_price, property.currency);
  const location = [property.zone, property.city].filter(Boolean).join(", ");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PropertyContextSetter
        context={{
          id: property.id,
          title: title || "Propiedad",
          slug: property.slug,
          propertyType: formatPropertyType(property.property_type),
          businessType: property.business_type,
          price,
          location,
        }}
      />
      <PropertyDetail property={property} />

      {/* AI Agent inline chat */}
      <div className="mt-8">
        <InlineChatWrapper
          organizationSlug={org.slug}
          agentName={org.agent_name}
          welcomeMessage={getI18nText(org.agent_welcome_message) || undefined}
        />
      </div>
    </div>
  );
}
