import { createAdminClient } from "@/lib/supabase/admin";
import { getI18nText, formatPrice, formatPropertyType, formatArea } from "@/lib/utils/format";

interface SearchInput {
  query?: string;
  property_type?: string;
  business_type?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
}

interface PropertyDetailsInput {
  property_id: string;
}

interface RegisterLeadInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  interested_property_id?: string;
}

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  organizationId: string,
  conversationId?: string
): Promise<string> {
  switch (toolName) {
    case "search_properties":
      return searchProperties(toolInput as unknown as SearchInput, organizationId);
    case "get_property_details":
      return getPropertyDetails(toolInput as unknown as PropertyDetailsInput, organizationId);
    case "register_lead":
      return registerLead(
        toolInput as unknown as RegisterLeadInput,
        organizationId,
        conversationId
      );
    default:
      return JSON.stringify({ error: "Herramienta no reconocida" });
  }
}

async function searchProperties(
  input: SearchInput,
  organizationId: string
): Promise<string> {
  const supabase = createAdminClient();

  let query = supabase
    .from("properties")
    .select("id, title, property_type, business_type, sale_price, rent_price, currency, city, zone, bedrooms, bathrooms, built_area_m2, slug, is_featured")
    .eq("organization_id", organizationId)
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  if (input.property_type) {
    query = query.eq("property_type", input.property_type);
  }
  if (input.business_type) {
    query = query.eq("business_type", input.business_type);
  }
  if (input.city) {
    query = query.ilike("city", `%${input.city}%`);
  }
  if (input.bedrooms) {
    query = query.gte("bedrooms", input.bedrooms);
  }
  if (input.min_price) {
    query = query.or(
      `sale_price.gte.${input.min_price},rent_price.gte.${input.min_price}`
    );
  }
  if (input.max_price) {
    query = query.or(
      `sale_price.lte.${input.max_price},rent_price.lte.${input.max_price}`
    );
  }
  if (input.query) {
    query = query.textSearch("fts", input.query, {
      type: "websearch",
      config: "spanish",
    });
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: "No se encontraron propiedades con esos criterios.",
      count: 0,
    });
  }

  const results = data.map((p) => ({
    id: p.id,
    title: getI18nText(p.title),
    type: formatPropertyType(p.property_type),
    business: p.business_type,
    price:
      p.business_type === "arriendo"
        ? formatPrice(p.rent_price, p.currency) + "/mes"
        : formatPrice(p.sale_price, p.currency),
    location: [p.zone, p.city].filter(Boolean).join(", "),
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.built_area_m2 ? formatArea(p.built_area_m2) : null,
    featured: p.is_featured,
    slug: p.slug,
  }));

  return JSON.stringify({
    count: results.length,
    properties: results,
  });
}

async function getPropertyDetails(
  input: PropertyDetailsInput,
  organizationId: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", input.property_id)
    .eq("organization_id", organizationId)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return JSON.stringify({ error: "Propiedad no encontrada" });
  }

  return JSON.stringify({
    id: data.id,
    title: getI18nText(data.title),
    description: getI18nText(data.description),
    type: formatPropertyType(data.property_type),
    business: data.business_type,
    sale_price: data.sale_price > 0 ? formatPrice(data.sale_price, data.currency) : null,
    rent_price: data.rent_price > 0 ? formatPrice(data.rent_price, data.currency) + "/mes" : null,
    admin_fee: data.admin_fee > 0 ? formatPrice(data.admin_fee, data.currency) : null,
    location: [data.address, data.zone, data.locality, data.city, data.state_department]
      .filter(Boolean)
      .join(", "),
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    parking: data.parking_spots,
    built_area: data.built_area_m2 ? formatArea(data.built_area_m2) : null,
    private_area: data.private_area_m2 ? formatArea(data.private_area_m2) : null,
    stratum: data.stratum,
    year_built: data.year_built,
    features: data.features,
    slug: data.slug,
  });
}

async function registerLead(
  input: RegisterLeadInput,
  organizationId: string,
  conversationId?: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id: organizationId,
      full_name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
      interested_property_id: input.interested_property_id || null,
      source: "ai_chat",
      pipeline_stage: "nuevo",
      conversation_id: conversationId || null,
    })
    .select("id")
    .single();

  if (error) {
    return JSON.stringify({ error: "No se pudo registrar el contacto: " + error.message });
  }

  return JSON.stringify({
    success: true,
    message: `Lead registrado exitosamente. ID: ${data.id}`,
  });
}
