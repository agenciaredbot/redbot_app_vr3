import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PUT /api/profile — Update own user profile (full_name)
 * Any authenticated user can update their own name.
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const fullName = body.full_name?.trim();

  if (!fullName || fullName.length < 2) {
    return NextResponse.json(
      { error: "El nombre debe tener al menos 2 caracteres" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("full_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
