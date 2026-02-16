import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  // Get conversation messages if there's a conversation
  let messages = null;
  if (lead.conversation_id) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", lead.conversation_id)
      .order("created_at", { ascending: true });
    messages = msgs;
  }

  // Get tags
  const { data: leadTags } = await supabase
    .from("lead_tags")
    .select("tag_id, tags(id, name, color, category)")
    .eq("lead_id", id);

  return NextResponse.json({
    lead,
    messages,
    tags: leadTags?.map((lt: Record<string, unknown>) => lt.tags) || [],
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.pipeline_stage !== undefined) updateData.pipeline_stage = body.pipeline_stage;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.full_name !== undefined) updateData.full_name = body.full_name;
  if (body.email !== undefined) updateData.email = body.email || null;
  if (body.phone !== undefined) updateData.phone = body.phone || null;
  if (body.temperature !== undefined) updateData.temperature = body.temperature;

  const { data, error } = await supabase
    .from("leads")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
