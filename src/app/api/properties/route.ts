import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/utils/slug";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const propertyType = searchParams.get("property_type") || "";
  const businessType = searchParams.get("business_type") || "";

  const offset = (page - 1) * limit;

  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.textSearch("fts", search, { type: "websearch", config: "spanish" });
  }
  if (propertyType) {
    query = query.eq("property_type", propertyType);
  }
  if (businessType) {
    query = query.eq("business_type", businessType);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    properties: data,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get current user's org
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "org_agent") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json();

  const slug = generateSlug(body.title_es || "propiedad");

  const { data, error } = await supabase
    .from("properties")
    .insert({
      organization_id: profile.organization_id!,
      title: { es: body.title_es },
      description: body.description_es ? { es: body.description_es } : null,
      slug,
      property_type: body.property_type,
      business_type: body.business_type,
      property_status: body.property_status || "usado",
      availability: body.availability || "disponible",
      sale_price: body.sale_price || 0,
      rent_price: body.rent_price || 0,
      currency: body.currency || "COP",
      admin_fee: body.admin_fee || 0,
      city: body.city,
      state_department: body.state_department,
      zone: body.zone,
      address: body.address,
      locality: body.locality,
      built_area_m2: body.built_area_m2 || null,
      private_area_m2: body.private_area_m2 || null,
      land_area_m2: body.land_area_m2 || null,
      bedrooms: body.bedrooms || 0,
      bathrooms: body.bathrooms || 0,
      parking_spots: body.parking_spots || 0,
      stratum: body.stratum || null,
      year_built: body.year_built || null,
      features: body.features
        ? body.features.split(",").map((f: string) => f.trim()).filter(Boolean)
        : [],
      is_published: body.is_published ?? true,
      is_featured: body.is_featured ?? false,
      private_notes: body.private_notes,
      owner_name: body.owner_name,
      owner_phone: body.owner_phone,
      owner_email: body.owner_email || null,
      commission_value: body.commission_value || null,
      commission_type: body.commission_type || "percent",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ property: data }, { status: 201 });
}
