import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { PropertyDetail } from "@/components/properties/property-detail";
import { getI18nText } from "@/lib/utils/format";

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
    .select("id")
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PropertyDetail property={property} />
    </div>
  );
}
