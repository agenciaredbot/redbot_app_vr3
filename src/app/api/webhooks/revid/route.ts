import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRevidWebhookSecret, getVideoStatus } from "@/lib/video/revid-client";

/**
 * POST /api/webhooks/revid?secret=xxx
 * Webhook endpoint for Revid AI render completion notifications.
 *
 * Revid calls this URL when a video finishes rendering.
 * We verify the secret, look up the video_project, and update status.
 */
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.videoWebhook);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // Verify webhook secret from query param
    const secret = request.nextUrl.searchParams.get("secret");
    if (!verifyRevidWebhookSecret(secret)) {
      console.warn("[revid-webhook] Invalid or missing secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    console.log("[revid-webhook] Received:", JSON.stringify(body).slice(0, 500));

    // Extract project ID from webhook payload
    // Revid may send: { id, status, videoUrl, ... } or { projectId, ... }
    const revidProjectId =
      (body.id as string) ||
      (body.projectId as string) ||
      (body.pid as string) ||
      null;

    if (!revidProjectId) {
      console.warn("[revid-webhook] No project ID in payload:", body);
      return NextResponse.json({ received: true, warning: "No project ID" });
    }

    const supabase = createAdminClient();

    // Find our video_projects row
    const { data: videoProject, error: findError } = await supabase
      .from("video_projects")
      .select("id, revid_status")
      .eq("revid_project_id", revidProjectId)
      .single();

    if (findError || !videoProject) {
      console.warn(
        `[revid-webhook] No video_project found for revid pid=${revidProjectId}`
      );
      return NextResponse.json({ received: true, warning: "Project not found" });
    }

    // Skip if already completed or failed
    if (
      videoProject.revid_status === "completed" ||
      videoProject.revid_status === "failed"
    ) {
      console.log(
        `[revid-webhook] Already ${videoProject.revid_status}, skipping`
      );
      return NextResponse.json({ received: true });
    }

    // Fetch full status from Revid to get video URL
    const { data: revidStatus, error: statusError } =
      await getVideoStatus(revidProjectId);

    if (statusError || !revidStatus) {
      console.error("[revid-webhook] Failed to fetch status:", statusError);
      // Still mark as potentially done based on webhook data
      const webhookVideoUrl = body.videoUrl as string | undefined;
      if (webhookVideoUrl) {
        await supabase
          .from("video_projects")
          .update({
            revid_status: "completed",
            revid_video_url: webhookVideoUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", videoProject.id);
      }
      return NextResponse.json({ received: true });
    }

    const status = (revidStatus.status || "").toLowerCase();

    if (status === "ready" || status === "done" || status === "completed") {
      await supabase
        .from("video_projects")
        .update({
          revid_status: "completed",
          revid_video_url: revidStatus.videoUrl || null,
          credits_used: revidStatus.creditsConsumed || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", videoProject.id);

      console.log(
        `[revid-webhook] Completed: id=${videoProject.id} videoUrl=${revidStatus.videoUrl}`
      );
    } else if (status === "failed" || status === "error") {
      await supabase
        .from("video_projects")
        .update({
          revid_status: "failed",
          error_message: "Error en Revid",
        })
        .eq("id", videoProject.id);

      console.log(
        `[revid-webhook] Failed: id=${videoProject.id} error=${revidStatus.error}`
      );
    } else {
      console.log(
        `[revid-webhook] Status=${status} for id=${videoProject.id}, no update needed`
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[revid-webhook] Unhandled error:", err);
    return NextResponse.json({ received: true });
  }
}
