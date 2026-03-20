import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/video/list?propertyId=xxx
 * List video projects for a property (org-scoped).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext({
      allowedRoles: ["super_admin", "org_admin", "org_agent"],
    });
    if (authResult instanceof NextResponse) return authResult;
    const { organizationId } = authResult;

    const propertyId = request.nextUrl.searchParams.get("propertyId");
    if (!propertyId) {
      return NextResponse.json(
        { error: "Falta propertyId." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("video_projects")
      .select("*")
      .eq("property_id", propertyId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[video/list] Query error:", error);
      return NextResponse.json(
        { error: "Error al consultar videos." },
        { status: 500 }
      );
    }

    return NextResponse.json({ videos: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[video/list] Error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
