import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verify property exists and user has access
  const { data: property } = await supabase
    .from("properties")
    .select("id, organization_id, images")
    .eq("id", id)
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
      // Validate file type
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: No es una imagen válida`);
        continue;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: Excede el tamaño máximo de 5MB`);
        continue;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${property.organization_id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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
        .eq("id", id);
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, images")
    .eq("id", id)
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
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, images")
    .eq("id", id)
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
    .eq("id", id);

  return NextResponse.json({ images: updatedImages });
}
