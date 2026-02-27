import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
// SVG removed — XSS risk via embedded scripts
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Magic bytes for validating actual file content matches declared type
const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF"
};

async function validateImageMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const signatures = IMAGE_MAGIC_BYTES[file.type];
  if (!signatures) return false;
  return signatures.some((sig) => sig.every((b, i) => bytes[i] === b));
}

const DB_FIELD_MAP: Record<string, string> = {
  logo: "logo_url",
  favicon: "favicon_url",
  logo_light: "logo_light_url",
};

/**
 * POST /api/organizations/logo — Upload logo, logo_light, or favicon
 * FormData: file (image), type ("logo" | "favicon" | "logo_light")
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const imageType = formData.get("type") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!imageType || !DB_FIELD_MAP[imageType]) {
    return NextResponse.json(
      { error: "Tipo inválido. Debe ser 'logo', 'favicon' o 'logo_light'" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no soportado. Usa JPG, PNG o WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo no debe superar 2MB" },
      { status: 400 }
    );
  }

  // Validate magic bytes match declared MIME type
  const validMagic = await validateImageMagicBytes(file);
  if (!validMagic) {
    return NextResponse.json(
      { error: "El contenido del archivo no coincide con el tipo declarado" },
      { status: 400 }
    );
  }

  // Get current URL to delete old file if exists
  const dbField = DB_FIELD_MAP[imageType];
  const { data: org } = await supabase
    .from("organizations")
    .select("logo_url, favicon_url, logo_light_url")
    .eq("id", organizationId)
    .single();

  const oldUrl = (org as Record<string, unknown> | null)?.[dbField] as string | null;

  // Upload new file
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "webp";
  const fileName = `${organizationId}/branding/${imageType}-${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from("properties")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[logo-upload] Upload error:", uploadError.message);
    return NextResponse.json(
      { error: "Error subiendo archivo" },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("properties")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  // Update organization record
  const { error: updateError } = await supabase
    .from("organizations")
    .update({ [dbField]: publicUrl })
    .eq("id", organizationId);

  if (updateError) {
    console.error("[logo-upload] DB update error:", updateError.message);
    // Rollback: delete uploaded file
    await supabase.storage.from("properties").remove([fileName]);
    return NextResponse.json(
      { error: "Error actualizando la organización" },
      { status: 500 }
    );
  }

  // Delete old file from storage (if existed)
  if (oldUrl) {
    try {
      const oldPath = oldUrl.split("/properties/")[1];
      if (oldPath) {
        await supabase.storage.from("properties").remove([oldPath]);
      }
    } catch {
      // Non-critical: old file cleanup failed
    }
  }

  return NextResponse.json({ url: publicUrl });
}

/**
 * DELETE /api/organizations/logo — Remove logo, logo_light, or favicon
 * Body: { type: "logo" | "favicon" | "logo_light" }
 */
export async function DELETE(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const body = await request.json();
  const imageType = body.type;

  if (!imageType || !DB_FIELD_MAP[imageType]) {
    return NextResponse.json(
      { error: "Tipo inválido" },
      { status: 400 }
    );
  }

  const dbField = DB_FIELD_MAP[imageType];

  // Get current URL
  const { data: org } = await supabase
    .from("organizations")
    .select("logo_url, favicon_url, logo_light_url")
    .eq("id", organizationId)
    .single();

  const currentUrl = (org as Record<string, unknown> | null)?.[dbField] as string | null;

  // Clear in database
  const { error: updateError } = await supabase
    .from("organizations")
    .update({ [dbField]: null })
    .eq("id", organizationId);

  if (updateError) {
    console.error("[logo-delete] DB update error:", updateError.message);
    return NextResponse.json(
      { error: "Error actualizando la organización" },
      { status: 500 }
    );
  }

  // Delete from storage
  if (currentUrl) {
    try {
      const path = currentUrl.split("/properties/")[1];
      if (path) {
        await supabase.storage.from("properties").remove([path]);
      }
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({ success: true });
}
