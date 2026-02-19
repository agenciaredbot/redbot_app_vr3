import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const [orgResult, membersResult, propsResult, leadsResult, convsResult] =
    await Promise.all([
      ctx.supabase.from("organizations").select("*").eq("id", id).single(),
      ctx.supabase
        .from("user_profiles")
        .select("id, full_name, email, role, is_active, created_at, last_login_at")
        .eq("organization_id", id)
        .order("created_at", { ascending: true }),
      ctx.supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
      ctx.supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
      ctx.supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
    ]);

  if (orgResult.error || !orgResult.data) {
    return NextResponse.json(
      { error: "Organizacion no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    organization: orgResult.data,
    members: membersResult.data || [],
    stats: {
      properties: propsResult.count || 0,
      leads: leadsResult.count || 0,
      conversations: convsResult.count || 0,
      members: (membersResult.data || []).length,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = await request.json();

  // Only allow specific fields to be updated
  const allowedFields = [
    "plan_tier",
    "plan_status",
    "max_properties",
    "max_agents",
    "max_conversations_per_month",
    "is_active",
    "onboarding_completed",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      update[field] = body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No hay campos para actualizar" },
      { status: 400 }
    );
  }

  // Validate plan_tier
  if (update.plan_tier && !["basic", "power", "omni"].includes(update.plan_tier)) {
    return NextResponse.json(
      { error: "plan_tier debe ser basic, power u omni" },
      { status: 400 }
    );
  }

  // Validate plan_status
  if (
    update.plan_status &&
    !["trialing", "active", "past_due", "canceled", "unpaid"].includes(update.plan_status)
  ) {
    return NextResponse.json(
      { error: "plan_status invalido" },
      { status: 400 }
    );
  }

  update.updated_at = new Date().toISOString();

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organization: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  // 1. Get all user_profiles for this org (need IDs to delete auth.users)
  const { data: users } = await ctx.supabase
    .from("user_profiles")
    .select("id")
    .eq("organization_id", id);

  // 2. Delete auth.users for each member (cascades to user_profiles)
  if (users && users.length > 0) {
    for (const user of users) {
      const { error: deleteUserError } =
        await ctx.supabase.auth.admin.deleteUser(user.id);
      if (deleteUserError) {
        console.error(
          `[super-admin] Failed to delete auth user ${user.id}:`,
          deleteUserError.message
        );
      }
    }
  }

  // 3. Delete the organization (FK CASCADE handles: properties, leads,
  //    conversations, messages, tags, invitations, audit_logs, notifications)
  const { error } = await ctx.supabase
    .from("organizations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
