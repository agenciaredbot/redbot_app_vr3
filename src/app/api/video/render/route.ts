import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderVideo } from "@/lib/video/revid-client";
import type { CreateVideoRequest, RevidRenderPayload } from "@/lib/video/types";
import { DEFAULT_VOICE_ID, DEFAULT_MUSIC_TRACK } from "@/lib/video/types";

/**
 * POST /api/video/render
 * Create a video via Revid AI from a property.
 *
 * Body: CreateVideoRequest { propertyId, workflow, script, imageUrls, voiceId?, musicTrack?, aspectRatio? }
 * Returns: { videoProjectId, revidProjectId }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth
    const authResult = await getAuthContext({
      allowedRoles: ["super_admin", "org_admin"],
    });
    if (authResult instanceof NextResponse) return authResult;
    const { organizationId, userId } = authResult;

    // Rate limit
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.videoRender);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes de video. Espera unos minutos." },
        { status: 429 }
      );
    }

    // Feature gate
    const featureCheck = await hasFeatureForOrg(organizationId, "videoCreation");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: featureCheck.message },
        { status: 403 }
      );
    }

    // Parse body
    let body: CreateVideoRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body inválido." },
        { status: 400 }
      );
    }

    const {
      propertyId,
      workflow,
      templateSlug,
      script,
      imageUrls,
      enableVoice = true,
      voiceId,
      voiceSpeed,
      enableCaptions = true,
      captionPreset,
      captionPosition,
      enableMusic = true,
      musicTrack,
      aspectRatio,
      resolution,
      animation,
      soundEffects,
    } = body;

    // Validate
    if (!propertyId || !workflow || !script) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (propertyId, workflow, script)." },
        { status: 400 }
      );
    }

    if (!["script-to-video", "ad-generator", "prompt-to-video", "article-to-video", "static-background-video"].includes(workflow)) {
      return NextResponse.json(
        { error: "Workflow inválido." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify property belongs to org
    const { data: property } = await supabase
      .from("properties")
      .select("id, organization_id")
      .eq("id", propertyId)
      .eq("organization_id", organizationId)
      .single();

    if (!property) {
      return NextResponse.json(
        { error: "Propiedad no encontrada." },
        { status: 404 }
      );
    }

    // Build Revid payload with all user options
    const revidPayload: RevidRenderPayload = {
      workflow,
      ...(templateSlug ? { slugNew: templateSlug } : {}),
      aspectRatio: aspectRatio || "9 / 16",
      voice: {
        enabled: enableVoice !== false,
        voiceId: voiceId || DEFAULT_VOICE_ID,
        speed: voiceSpeed || 1,
      },
      captions: {
        enabled: enableCaptions !== false,
        preset: captionPreset || "Wrap 1",
        position: captionPosition || "bottom",
      },
      music: {
        enabled: enableMusic !== false,
        trackName: musicTrack || DEFAULT_MUSIC_TRACK,
      },
      render: {
        resolution: resolution || "1080p",
      },
      options: {
        soundEffects: soundEffects || false,
      },
    };

    // Set source based on workflow
    const mediaAnimation = animation || "soft";

    if (workflow === "prompt-to-video") {
      revidPayload.source = { prompt: script, durationSeconds: 30 };
      revidPayload.media = {
        type: "moving-image",
        quality: "pro",
        density: "high",
        animation: mediaAnimation,
      };
    } else {
      // script-to-video or ad-generator
      revidPayload.source = { text: script };

      if (imageUrls && imageUrls.length > 0) {
        // Use property images as custom media
        revidPayload.media = {
          type: "custom",
          useOnlyProvided: true,
          turnImagesIntoVideos: true,
          animation: mediaAnimation,
          provided: imageUrls.map((url, i) => ({
            url,
            title: `Imagen ${i + 1}`,
            type: "image" as const,
          })),
        };
      } else {
        // No images — use AI-generated visuals
        revidPayload.media = {
          type: "moving-image",
          quality: "pro",
          density: "high",
          animation: mediaAnimation,
        };
      }
    }

    // Insert video_projects row (pending)
    const { data: videoProject, error: insertError } = await supabase
      .from("video_projects")
      .insert({
        organization_id: organizationId,
        property_id: propertyId,
        workflow,
        script,
        images_used: imageUrls || [],
        voice_id: voiceId || DEFAULT_VOICE_ID,
        music_track: musicTrack || DEFAULT_MUSIC_TRACK,
        aspect_ratio: aspectRatio || "9 / 16",
        revid_status: "pending",
        created_by: userId,
      })
      .select("id")
      .single();

    if (insertError || !videoProject) {
      console.error("[video/render] Insert failed:", insertError);
      return NextResponse.json(
        { error: "Error al registrar el proyecto de video." },
        { status: 500 }
      );
    }

    // Call Revid API — await to get project ID
    const { projectId: revidProjectId, error: renderError } =
      await renderVideo(revidPayload);

    if (renderError || !revidProjectId) {
      // Update to failed
      await supabase
        .from("video_projects")
        .update({
          revid_status: "failed",
          error_message: renderError || "Error al iniciar el render",
        })
        .eq("id", videoProject.id);

      return NextResponse.json(
        { error: `Error al crear video: ${renderError}` },
        { status: 502 }
      );
    }

    // Update with Revid project ID
    await supabase
      .from("video_projects")
      .update({
        revid_project_id: revidProjectId,
        revid_status: "rendering",
      })
      .eq("id", videoProject.id);

    console.log(
      `[video/render] Started: videoProjectId=${videoProject.id} revidPid=${revidProjectId}`
    );

    return NextResponse.json({
      success: true,
      videoProjectId: videoProject.id,
      revidProjectId,
      message: "Video en proceso de creación...",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[video/render] Unhandled error:", err);
    return NextResponse.json(
      { error: `Error al crear video: ${message}` },
      { status: 500 }
    );
  }
}
