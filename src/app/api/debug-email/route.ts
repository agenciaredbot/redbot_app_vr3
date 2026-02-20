import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, EMAIL_FROM } from "@/lib/email/resend";

/**
 * TEMPORARY debug endpoint — remove after testing.
 * Call: GET /api/debug-email?org_id=YOUR_ORG_ID
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");

  const steps: Record<string, unknown> = {};

  try {
    // Step 1: Check env vars
    steps["1_env_RESEND_API_KEY"] = process.env.RESEND_API_KEY
      ? `Set (${process.env.RESEND_API_KEY.substring(0, 6)}...)`
      : "MISSING";
    steps["1_env_RESEND_FROM_EMAIL"] = process.env.RESEND_FROM_EMAIL || "MISSING (using default)";
    steps["1_env_EMAIL_FROM_resolved"] = EMAIL_FROM;

    // Step 2: Init Resend
    try {
      const resend = getResend();
      steps["2_resend_init"] = "OK";
    } catch (e: unknown) {
      steps["2_resend_init"] = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
      return NextResponse.json(steps);
    }

    if (!orgId) {
      steps["note"] = "Add ?org_id=YOUR_ORG_ID to test full flow";

      // List all orgs to help find the ID
      const supabase = createAdminClient();
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .limit(10);
      steps["3_available_orgs"] = orgs;

      return NextResponse.json(steps);
    }

    // Step 3: Fetch org
    const supabase = createAdminClient();
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", orgId)
      .single();

    steps["3_org"] = orgError ? `ERROR: ${orgError.message}` : org;

    // Step 4: Fetch admins
    const { data: admins, error: adminsError } = await supabase
      .from("user_profiles")
      .select("id, email, role, is_active, organization_id")
      .eq("organization_id", orgId)
      .eq("role", "org_admin")
      .eq("is_active", true);

    steps["4_admins"] = adminsError ? `ERROR: ${adminsError.message}` : admins;
    steps["4_admin_count"] = admins?.length ?? 0;

    if (!admins || admins.length === 0) {
      // Let's see ALL users for this org to debug
      const { data: allUsers } = await supabase
        .from("user_profiles")
        .select("id, email, role, is_active")
        .eq("organization_id", orgId);
      steps["4_all_users_in_org"] = allUsers;
    }

    // Step 5: Try sending a test email
    if (admins && admins.length > 0 && org) {
      const testEmails = admins.map((a: { email: string }) => a.email);
      steps["5_sending_to"] = testEmails;

      const { data: sendResult, error: sendError } = await getResend().emails.send({
        from: EMAIL_FROM,
        to: testEmails,
        subject: "[TEST] Diagnóstico de email - Redbot",
        html: `<h2>Email de diagnóstico</h2><p>Si ves esto, Resend funciona correctamente.</p><p>Org: ${org.name}</p><p>Timestamp: ${new Date().toISOString()}</p>`,
      });

      steps["5_send_result"] = sendResult;
      steps["5_send_error"] = sendError;
    }
  } catch (err: unknown) {
    steps["FATAL_ERROR"] = err instanceof Error ? err.message : String(err);
    steps["FATAL_STACK"] = err instanceof Error ? err.stack : undefined;
  }

  return NextResponse.json(steps, { status: 200 });
}
