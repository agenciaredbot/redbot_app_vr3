import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

/**
 * PUT /api/super-admin/tutorials/[id] — Update a tutorial
 * Body: { title?, description?, youtube_url?, category?, is_published?, sort_order? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const { id } = await params;
  const body = await request.json();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: "El título debe tener al menos 2 caracteres" },
        { status: 400 }
      );
    }
    updates.title = title;
  }

  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null;
  }

  if (body.youtube_url !== undefined) {
    updates.youtube_url = body.youtube_url?.trim() || null;
  }

  if (body.category !== undefined) {
    if (!["general", "premium"].includes(body.category)) {
      return NextResponse.json(
        { error: "Categoría inválida" },
        { status: 400 }
      );
    }
    updates.category = body.category;
  }

  if (body.is_published !== undefined) {
    updates.is_published = Boolean(body.is_published);
  }

  if (body.sort_order !== undefined) {
    updates.sort_order = Number(body.sort_order);
  }

  const { data, error } = await supabase
    .from("tutorials")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Tutorial no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ tutorial: data });
}

/**
 * DELETE /api/super-admin/tutorials/[id] — Delete a tutorial
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const { id } = await params;

  const { error } = await supabase.from("tutorials").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
