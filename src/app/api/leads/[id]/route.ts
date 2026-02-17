import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  // Get tags
  const { data: leadTags } = await supabase
    .from("lead_tags")
    .select("tag_id, tags(id, value, color, category)")
    .eq("lead_id", id);

  return NextResponse.json({
    lead,
    tags: leadTags?.map((lt: Record<string, unknown>) => lt.tags) || [],
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  // Verify lead belongs to this org before updating
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!existingLead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

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
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
