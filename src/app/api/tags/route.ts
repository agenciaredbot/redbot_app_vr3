import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("organization_id", organizationId)
    .order("category")
    .order("value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tags: data });
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const body = await request.json();

  if (!body.value) {
    return NextResponse.json({ error: "value requerido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({
      organization_id: organizationId,
      value: body.value,
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
