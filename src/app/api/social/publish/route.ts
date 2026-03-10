import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishCarousel } from "@/lib/social/late-client";
import type { SocialConnection } from "@/lib/social/types";

/**
 * POST /api/social/publish
 * Publish a property as an Instagram carousel via Late.
 *
 * Returns immediately after sending the request to Late.
 * The client should poll GET /api/social/posts/check?postId=xxx
 * to see the final result.
 *
 * Body: { propertyId, accountId, caption, imageUrls }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authResult = await getAuthContext({
      allowedRoles: ["super_admin", "org_admin"],
    });
    if (authResult instanceof NextResponse) return authResult;
    const { organizationId } = authResult;

    // Rate limit
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.socialPublish);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un momento." },
        { status: 429 }
      );
    }

    // Feature gate
    const featureCheck = await hasFeatureForOrg(organizationId, "socialPublishing");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: featureCheck.message },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body inválido." },
        { status: 400 }
      );
    }

    const { propertyId, accountId, caption, imageUrls } = body as {
      propertyId: string;
      accountId: string;
      caption: string;
      imageUrls: string[];
    };

    // Validate inputs
    if (!propertyId || !accountId || !caption || !imageUrls?.length) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (propertyId, accountId, caption, imageUrls)." },
        { status: 400 }
      );
    }

    if (imageUrls.length > 10) {
      return NextResponse.json(
        { error: "Máximo 10 imágenes por carrusel." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get active Late connection for this org
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("platform", "late")
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "No hay conexión con Late configurada. Ve a Configuración → Redes Sociales." },
        { status: 400 }
      );
    }

    const conn = connection as unknown as SocialConnection;

    // Verify property belongs to this org
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

    // Create social_post record (status: publishing)
    const { data: socialPost, error: insertError } = await supabase
      .from("social_posts")
      .insert({
        organization_id: organizationId,
        property_id: propertyId,
        connection_id: conn.id,
        platform: "instagram",
        status: "publishing",
        caption,
        images_used: imageUrls,
      })
      .select("id")
      .single();

    if (insertError || !socialPost) {
      console.error("[social/publish] Insert failed:", insertError);
      return NextResponse.json(
        { error: "Error al registrar la publicación." },
        { status: 500 }
      );
    }

    // Fire the Late API call — don't await it.
    // The HTTP request will be sent immediately. Even if Vercel kills
    // this function at the 10s timeout, the request is already in flight
    // and Late will process it. We update the DB in the background.
    publishCarousel(conn.api_key, {
      accountId,
      caption,
      imageUrls,
    }).then(async (result) => {
      try {
        if (result.success) {
          await supabase
            .from("social_posts")
            .update({
              status: "published",
              platform_post_id: result.postId || null,
              platform_post_url: result.postUrl || null,
              published_at: new Date().toISOString(),
            })
            .eq("id", socialPost.id);
        } else {
          await supabase
            .from("social_posts")
            .update({
              status: "failed",
              error_message: result.error || "Error desconocido",
            })
            .eq("id", socialPost.id);
        }
      } catch (dbErr) {
        console.error("[social/publish] Background DB update failed:", dbErr);
      }
    }).catch(async (err) => {
      console.error("[social/publish] Background Late call failed:", err);
      try {
        await supabase
          .from("social_posts")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Error de conexión con Late",
          })
          .eq("id", socialPost.id);
      } catch {
        // Best effort — function may be killed by now
      }
    });

    // Respond immediately — client will poll for status
    return NextResponse.json({
      success: true,
      postId: socialPost.id,
      message: "Publicación enviada. Procesando...",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    console.error("[social/publish] Unhandled error:", err);
    return NextResponse.json(
      { error: `Error al publicar: ${message}` },
      { status: 500 }
    );
  }
}
