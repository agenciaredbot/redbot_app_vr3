import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export async function GET(request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const stage = searchParams.get("stage") || "";
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (stage) {
    query = query.eq("pipeline_stage", stage);
  }
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
