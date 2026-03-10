import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/social/upload-cropped
 *
 * Receives a cropped image blob (from Canvas) and uploads it to
 * Supabase storage so it can be used as a publicly accessible URL
 * for Late / Instagram publishing.
 *
 * Body: FormData with "image" (Blob, JPEG)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext({
      allowedRoles: ["super_admin", "org_admin"],
    });
    if (authResult instanceof NextResponse) return authResult;
    const { organizationId } = authResult;

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No se recibió imagen." },
        { status: 400 }
      );
    }

    // Limit: 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "La imagen excede 5 MB." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const fileName = `${organizationId}/social-crops/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("properties")
      .upload(fileName, file, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[upload-cropped] Storage upload error:", uploadError.message);
      return NextResponse.json(
        { error: "Error subiendo imagen recortada." },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("properties")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("[upload-cropped] Unhandled error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
