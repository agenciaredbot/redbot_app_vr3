import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

export async function GET(request: NextRequest) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const planTier = searchParams.get("plan_tier") || "";
  const planStatus = searchParams.get("plan_status") || "";
  const isActive = searchParams.get("is_active");
  const offset = (page - 1) * limit;

  let query = ctx.supabase
    .from("organizations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,slug.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (planTier) query = query.eq("plan_tier", planTier);
  if (planStatus) query = query.eq("plan_status", planStatus);
  if (isActive !== null && isActive !== "") {
    query = query.eq("is_active", isActive === "true");
  }

  const { data: organizations, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get member counts per org
  const orgIds = (organizations || []).map((o: { id: string }) => o.id);

  let memberCounts: Record<string, number> = {};
  let propertyCounts: Record<string, number> = {};
  let leadCounts: Record<string, number> = {};

  if (orgIds.length > 0) {
    const [membersResult, propsResult, leadsResult] = await Promise.all([
      ctx.supabase
        .from("user_profiles")
        .select("organization_id")
        .in("organization_id", orgIds)
        .eq("is_active", true),
      ctx.supabase
        .from("properties")
        .select("organization_id")
        .in("organization_id", orgIds),
      ctx.supabase
        .from("leads")
        .select("organization_id")
        .in("organization_id", orgIds),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (membersResult.data || []).forEach((m: any) => {
      memberCounts[m.organization_id] = (memberCounts[m.organization_id] || 0) + 1;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (propsResult.data || []).forEach((p: any) => {
      propertyCounts[p.organization_id] = (propertyCounts[p.organization_id] || 0) + 1;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (leadsResult.data || []).forEach((l: any) => {
      leadCounts[l.organization_id] = (leadCounts[l.organization_id] || 0) + 1;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = (organizations || []).map((org: any) => ({
    ...org,
    _memberCount: memberCounts[org.id] || 0,
    _propertyCount: propertyCounts[org.id] || 0,
    _leadCount: leadCounts[org.id] || 0,
  }));

  const total = count || 0;

  return NextResponse.json({
    organizations: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
