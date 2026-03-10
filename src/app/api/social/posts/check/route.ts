import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/social/posts/check?postId=xxx
 *
 * Polls the status of a social_post record.
 * Used by the client after the publish endpoint returns immediately.
 *
 * Returns: { status, postUrl?, error? }
 *   status: "publishing" | "published" | "failed"
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext({
      allowedRoles: ["super_admin", "org_admin"],
    });
    if (authResult instanceof NextResponse) return authResult;
    const { organizationId } = authResult;

    const postId = request.nextUrl.searchParams.get("postId");
    if (!postId) {
      return NextResponse.json(
        { error: "postId requerido." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: post, error } = await supabase
      .from("social_posts")
      .select("id, status, platform_post_url, error_message")
      .eq("id", postId)
      .eq("organization_id", organizationId)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: "Publicación no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: post.status,
      postUrl: post.platform_post_url || null,
      error: post.error_message || null,
    });
  } catch (err) {
    console.error("[social/posts/check] Error:", err);
    return NextResponse.json(
      { error: "Error interno." },
      { status: 500 }
    );
  }
}
