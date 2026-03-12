import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSuperAdminContext } from "@/lib/auth/get-super-admin-context";
import {
  IMPERSONATION_COOKIE_NAME,
  getImpersonationCookieOptions,
} from "@/lib/auth/impersonation";
import { logAuditAction } from "@/lib/audit/log-action";

/**
 * POST /api/super-admin/impersonate
 * Start impersonating an organization.
 * Sets the impersonation cookie and returns the org slug for redirect.
 */
export async function POST(request: NextRequest) {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const { organizationId } = body;

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId es requerido" },
      { status: 400 }
    );
  }

  // Validate org exists
  const { data: org, error } = await ctx.supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("id", organizationId)
    .single();

  if (error || !org) {
    return NextResponse.json(
      { error: "Organización no encontrada" },
      { status: 404 }
    );
  }

  // Set impersonation cookie
  const cookieStore = await cookies();
  cookieStore.set(
    IMPERSONATION_COOKIE_NAME,
    org.id,
    getImpersonationCookieOptions()
  );

  // Audit log
  await logAuditAction(ctx.supabase, {
    actorId: ctx.userId,
    organizationId: org.id,
    action: "impersonate_start",
    metadata: { org_name: org.name, org_slug: org.slug },
  });

  return NextResponse.json({
    success: true,
    slug: org.slug,
    name: org.name,
  });
}

/**
 * DELETE /api/super-admin/impersonate
 * Stop impersonating. Clears the cookie.
 */
export async function DELETE() {
  const ctx = await getSuperAdminContext();
  if (ctx instanceof NextResponse) return ctx;

  const cookieStore = await cookies();
  const currentCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
  const impersonatedOrgId = currentCookie?.value;

  // Clear cookie
  cookieStore.set(
    IMPERSONATION_COOKIE_NAME,
    "",
    getImpersonationCookieOptions(0) // maxAge: 0 → delete
  );

  // Audit log
  if (impersonatedOrgId) {
    await logAuditAction(ctx.supabase, {
      actorId: ctx.userId,
      organizationId: impersonatedOrgId,
      action: "impersonate_stop",
    });
  }

  return NextResponse.json({ success: true });
}
