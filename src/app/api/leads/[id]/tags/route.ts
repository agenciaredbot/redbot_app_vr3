import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { tag_id } = await request.json();

  if (!tag_id) {
    return NextResponse.json({ error: "tag_id requerido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("lead_tags")
    .insert({ lead_id: id, tag_id });

  if (error) {
    // Likely duplicate — ignore
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { tag_id } = await request.json();

  if (!tag_id) {
    return NextResponse.json({ error: "tag_id requerido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("lead_tags")
    .delete()
    .eq("lead_id", id)
    .eq("tag_id", tag_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
