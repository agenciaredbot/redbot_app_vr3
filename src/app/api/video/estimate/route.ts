import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasFeatureForOrg } from "@/lib/plans/feature-gate";
import { calculateCredits } from "@/lib/video/revid-client";
import type { RevidRenderPayload } from "@/lib/video/types";

/**
 * POST /api/video/estimate
 * Estimate how many Revid credits a video render will cost.
 *
 * Body: Partial render payload (workflow, media config, voice, etc.)
 * Returns: { credits: number }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext({
      allowedRoles: ["super_admin", "org_admin"],
    });
    if (authResult instanceof NextResponse) return authResult;
    const { organizationId } = authResult;

    // Feature gate
    const featureCheck = await hasFeatureForOrg(organizationId, "videoCreation");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: featureCheck.message },
        { status: 403 }
      );
    }

    let body: RevidRenderPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body inválido." },
        { status: 400 }
      );
    }

    const { credits, error } = await calculateCredits(body);

    if (error) {
      return NextResponse.json(
        { error: `Error al estimar créditos: ${error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ credits });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[video/estimate] Error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
