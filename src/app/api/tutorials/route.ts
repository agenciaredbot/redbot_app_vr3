import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tutorials — List published tutorials for authenticated users
 * Query params: category (general|premium) — optional filter
 *
 * Returns all published tutorials. The frontend decides which to show
 * based on the org's plan_tier (general for all, premium for power/omni).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("tutorials")
    .select("id, title, description, youtube_url, category, sort_order")
    .eq("is_published", true)
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
