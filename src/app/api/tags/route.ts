import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("category")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tags: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({
      name: body.name,
      color: body.color || "#6B7280",
      category: body.category || "custom",
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data }, { status: 201 });
}
