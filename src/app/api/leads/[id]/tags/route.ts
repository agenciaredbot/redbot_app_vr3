import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  // Verify lead belongs to this org
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const { tag_id } = await request.json();

  if (!tag_id) {
    return NextResponse.json({ error: "tag_id requerido" }, { status: 400 });
  }

  // Verify tag belongs to this org or is a system tag
  const { data: tag } = await supabase
    .from("tags")
    .select("id")
    .eq("id", tag_id)
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .single();

  if (!tag) {
    return NextResponse.json({ error: "Tag no encontrado" }, { status: 404 });
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
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  // Verify lead belongs to this org
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

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
