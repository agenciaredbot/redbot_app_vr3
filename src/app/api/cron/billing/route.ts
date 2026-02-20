import { NextRequest, NextResponse } from "next/server";
import { processBillingCron } from "@/lib/billing/engine";

/**
 * POST /api/cron/billing — Daily billing cron job
 *
 * Protected with CRON_SECRET bearer token.
 * Should be called daily by Vercel Cron or external cron service.
 *
 * Tasks (simplified — MP handles renewals & retries):
 * 1. Process cancel-at-period-end subscriptions
 * 2. Expire trials past trial_ends_at
 * 3. Sync subscription status with Mercado Pago
 * 4. Reset monthly conversation counters
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/billing] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/billing] Starting billing cron...");
    const result = await processBillingCron();
    console.log(
      `[cron/billing] Done — Canceled: ${result.canceledAtPeriodEnd}, Trials expired: ${result.expiredTrials}, Synced: ${result.statusSynced}, Conversations reset: ${result.conversationsReset}, Errors: ${result.errors.length}`
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/billing] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron error" },
      { status: 500 }
    );
  }
}
