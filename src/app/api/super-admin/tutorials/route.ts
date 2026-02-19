import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

/**
 * GET /api/super-admin/tutorials — List all tutorials (published + unpublished)
 * Query params: category (general|premium)
 */
export async function GET(request: NextRequest) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("tutorials")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (category && ["general", "premium"].includes(category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tutorials: data || [] });
}

/**
 * POST /api/super-admin/tutorials — Create a new tutorial
 * Body: { title, description?, youtube_url?, category?, sort_order? }
 */
export async function POST(request: NextRequest) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const body = await request.json();
  const title = body.title?.trim();

  if (!title || title.length < 2) {
    return NextResponse.json(
      { error: "El título debe tener al menos 2 caracteres" },
      { status: 400 }
    );
  }

  const category = body.category || "general";
  if (!["general", "premium"].includes(category)) {
    return NextResponse.json(
      { error: "Categoría inválida. Debe ser 'general' o 'premium'" },
      { status: 400 }
    );
  }

  // Get next sort_order for this category
  const { data: lastTutorial } = await supabase
    .from("tutorials")
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (lastTutorial?.sort_order || 0) + 1;

  const { data, error } = await supabase
    .from("tutorials")
    .insert({
      title,
      description: body.description?.trim() || null,
      youtube_url: body.youtube_url?.trim() || null,
      category,
      sort_order: body.sort_order ?? sortOrder,
      is_published: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tutorial: data }, { status: 201 });
}
