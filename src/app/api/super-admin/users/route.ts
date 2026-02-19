import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

export async function GET(request: NextRequest) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const orgId = searchParams.get("org_id") || "";
  const isActive = searchParams.get("is_active");
  const offset = (page - 1) * limit;

  let query = ctx.supabase
    .from("user_profiles")
    .select("*, organizations(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (role) query = query.eq("role", role);
  if (orgId) query = query.eq("organization_id", orgId);
  if (isActive !== null && isActive !== "") {
    query = query.eq("is_active", isActive === "true");
  }

  const { data: users, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count || 0;

  return NextResponse.json({
    users: users || [],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
