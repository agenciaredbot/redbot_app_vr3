import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ property: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();

  // Build update object
  const update: Record<string, unknown> = {};

  if (body.title_es !== undefined) update.title = { es: body.title_es };
  if (body.description_es !== undefined) update.description = body.description_es ? { es: body.description_es } : null;
  if (body.property_type !== undefined) update.property_type = body.property_type;
  if (body.business_type !== undefined) update.business_type = body.business_type;
  if (body.property_status !== undefined) update.property_status = body.property_status;
  if (body.availability !== undefined) update.availability = body.availability;
  if (body.sale_price !== undefined) update.sale_price = body.sale_price;
  if (body.rent_price !== undefined) update.rent_price = body.rent_price;
  if (body.currency !== undefined) update.currency = body.currency;
  if (body.admin_fee !== undefined) update.admin_fee = body.admin_fee;
  if (body.city !== undefined) update.city = body.city;
  if (body.state_department !== undefined) update.state_department = body.state_department;
  if (body.zone !== undefined) update.zone = body.zone;
  if (body.address !== undefined) update.address = body.address;
  if (body.locality !== undefined) update.locality = body.locality;
  if (body.built_area_m2 !== undefined) update.built_area_m2 = body.built_area_m2;
  if (body.private_area_m2 !== undefined) update.private_area_m2 = body.private_area_m2;
  if (body.land_area_m2 !== undefined) update.land_area_m2 = body.land_area_m2;
  if (body.bedrooms !== undefined) update.bedrooms = body.bedrooms;
  if (body.bathrooms !== undefined) update.bathrooms = body.bathrooms;
  if (body.parking_spots !== undefined) update.parking_spots = body.parking_spots;
  if (body.stratum !== undefined) update.stratum = body.stratum;
  if (body.year_built !== undefined) update.year_built = body.year_built;
  if (body.features !== undefined) {
    update.features = typeof body.features === "string"
      ? body.features.split(",").map((f: string) => f.trim()).filter(Boolean)
      : body.features;
  }
  if (body.is_published !== undefined) update.is_published = body.is_published;
  if (body.is_featured !== undefined) update.is_featured = body.is_featured;
  if (body.private_notes !== undefined) update.private_notes = body.private_notes;
  if (body.owner_name !== undefined) update.owner_name = body.owner_name;
  if (body.owner_phone !== undefined) update.owner_phone = body.owner_phone;
  if (body.owner_email !== undefined) update.owner_email = body.owner_email;
  if (body.commission_value !== undefined) update.commission_value = body.commission_value;
  if (body.commission_type !== undefined) update.commission_type = body.commission_type;

  const { data, error } = await supabase
    .from("properties")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ property: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
