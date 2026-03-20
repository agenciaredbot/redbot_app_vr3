import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVideoStatus } from "@/lib/video/revid-client";
import type { VideoProject } from "@/lib/video/types";

/**
 * GET /api/video/status?videoProjectId=xxx
 * Poll the status of a video project.
 *
 * If the video is still rendering and we have a Revid project ID,
 * we also check Revid directly and update the DB if done.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext({
      allowedRoles: ["super_admin", "org_admin", "org_agent"],
    });
    if (authResult instanceof NextResponse) return authResult;
    const { organizationId } = authResult;

    const videoProjectId = request.nextUrl.searchParams.get("videoProjectId");
    if (!videoProjectId) {
      return NextResponse.json(
        { error: "Falta videoProjectId." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("video_projects")
      .select("*")
      .eq("id", videoProjectId)
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Proyecto de video no encontrado." },
        { status: 404 }
      );
    }

    const project = data as unknown as VideoProject;

    // If still rendering and we have a Revid PID, check Revid directly
    if (
      project.revid_status === "rendering" &&
      project.revid_project_id
    ) {
      const { data: revidStatus } = await getVideoStatus(
        project.revid_project_id
      );

      if (revidStatus) {
        const status = (revidStatus.status || "").toLowerCase();

        if (status === "done" || status === "completed") {
          // Update DB
          await supabase
            .from("video_projects")
            .update({
              revid_status: "completed",
              revid_video_url: revidStatus.videoUrl || null,
              revid_thumbnail_url: revidStatus.thumbnailUrl || null,
              credits_used: revidStatus.creditsUsed || null,
              completed_at: new Date().toISOString(),
            })
            .eq("id", videoProjectId);

          return NextResponse.json({
            status: "completed",
            videoUrl: revidStatus.videoUrl || null,
            thumbnailUrl: revidStatus.thumbnailUrl || null,
          });
        }

        if (status === "failed" || status === "error") {
          await supabase
            .from("video_projects")
            .update({
              revid_status: "failed",
              error_message: revidStatus.error || "Error en Revid",
            })
            .eq("id", videoProjectId);

          return NextResponse.json({
            status: "failed",
            error: revidStatus.error || "Error al renderizar el video.",
          });
        }
      }
    }

    // Return current DB state
    return NextResponse.json({
      status: project.revid_status,
      videoUrl: project.revid_video_url,
      thumbnailUrl: project.revid_thumbnail_url,
      error: project.error_message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[video/status] Error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
