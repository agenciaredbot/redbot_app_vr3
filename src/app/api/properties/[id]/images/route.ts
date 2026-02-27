import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

// Allowed image types and their magic bytes (first bytes of file)
const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF"
  "image/gif": [[0x47, 0x49, 0x46]], // "GIF"
};

async function validateImageMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const signatures = IMAGE_MAGIC_BYTES[file.type];
  if (!signatures) return false;
  return signatures.some((sig) => sig.every((b, i) => bytes[i] === b));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  // Verify property exists AND belongs to this org
  const { data: property } = await supabase
    .from("properties")
    .select("id, organization_id, images")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("images") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No se enviaron imágenes" }, { status: 400 });
    }

    const maxImages = 20;
    const currentImages = (property.images as string[]) || [];
    if (currentImages.length + files.length > maxImages) {
      return NextResponse.json(
        { error: `Máximo ${maxImages} imágenes por propiedad` },
        { status: 400 }
      );
    }

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate file type — reject SVGs (XSS risk) and non-images
      if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        continue;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: Excede el tamaño máximo de 5MB`);
        continue;
      }

      // Validate magic bytes match declared MIME type
      const validMagic = await validateImageMagicBytes(file);
      if (!validMagic) {
        errors.push(`${file.name}: El contenido no coincide con el tipo de archivo`);
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
      const fileName = `${organizationId}/${id}/${crypto.randomUUID()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("properties")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        errors.push(`${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("properties")
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    // Update property with new image URLs
    if (uploadedUrls.length > 0) {
      const updatedImages = [...currentImages, ...uploadedUrls];
      await supabase
        .from("properties")
        .update({ images: updatedImages })
        .eq("id", id)
        .eq("organization_id", organizationId);
    }

    return NextResponse.json({
      uploaded: uploadedUrls,
      errors,
    });
  } catch (err) {
    console.error("Image upload error:", err);
    return NextResponse.json(
      { error: "Error subiendo imágenes" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { data: property } = await supabase
    .from("properties")
    .select("id, images")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }

  const { images } = await request.json();

  if (!Array.isArray(images)) {
    return NextResponse.json({ error: "images debe ser un array" }, { status: 400 });
  }

  // Validate that all URLs in the new order exist in the current images
  const currentImages = new Set((property.images as string[]) || []);
  const allValid = images.every((url: string) => currentImages.has(url));

  if (!allValid || images.length !== currentImages.size) {
    return NextResponse.json(
      { error: "Las URLs no coinciden con las imágenes actuales" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("properties")
    .update({ images })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  return NextResponse.json({ images });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { data: property } = await supabase
    .from("properties")
    .select("id, images")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }

  const { imageUrl } = await request.json();
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl requerido" }, { status: 400 });
  }

  const currentImages = (property.images as string[]) || [];
  const updatedImages = currentImages.filter((url: string) => url !== imageUrl);

  // Delete from storage
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/storage/v1/object/public/properties/");
    if (pathParts[1]) {
      await supabase.storage.from("properties").remove([pathParts[1]]);
    }
  } catch {
    // Continue even if storage delete fails
  }

  // Update property
  await supabase
    .from("properties")
    .update({ images: updatedImages })
    .eq("id", id)
    .eq("organization_id", organizationId);

  return NextResponse.json({ images: updatedImages });
}
