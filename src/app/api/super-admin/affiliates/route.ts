import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

/**
 * GET /api/super-admin/affiliates
 * List all affiliates with optional filters.
 */
export async function GET(request: NextRequest) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase } = ctx;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("affiliates")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("affiliate_type", type);
  if (search) query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ affiliates: data || [], total: count || 0, page, limit });
}
