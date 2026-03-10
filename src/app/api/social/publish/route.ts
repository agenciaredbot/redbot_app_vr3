import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishCarousel } from "@/lib/social/late-client";
import type { SocialConnection } from "@/lib/social/types";

export const maxDuration = 55; // Vercel timeout — image uploads may take time

/**
 * POST /api/social/publish
 * Publish a property as an Instagram carousel via Late.
 *
 * Body: { propertyId, accountId, caption, imageUrls }
 */
export async function POST(request: NextRequest) {
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

  const body = await request.json();
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
  const { data: connection } = await supabase
    .from("social_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("platform", "late")
    .eq("is_active", true)
    .single();

  if (!connection) {
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

  // Publish via Late
  const result = await publishCarousel(conn.api_key, {
    accountId,
    caption,
    imageUrls,
  });

  // Update social_post with result
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

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Error al publicar en Instagram." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    postUrl: result.postUrl,
    postId: result.postId,
    message: "Publicado exitosamente en Instagram.",
  });
}
