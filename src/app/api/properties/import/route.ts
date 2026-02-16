import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseExcelBuffer,
  mapColumns,
  validateAndTransformRows,
} from "@/lib/utils/property-import";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "org_agent") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const organizationId = profile.organization_id;
  if (!organizationId) {
    return NextResponse.json(
      { error: "No perteneces a una organización" },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const ext = file.name.toLowerCase().split(".").pop();
    if (!allowedTypes.includes(file.type) && !["xlsx", "xls", "csv"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa Excel (.xlsx/.xls) o CSV (.csv)" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rawRows = parseExcelBuffer(buffer);

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío o no tiene datos" },
        { status: 400 }
      );
    }

    if (rawRows.length > 500) {
      return NextResponse.json(
        { error: "Máximo 500 propiedades por importación" },
        { status: 400 }
      );
    }

    const { mappedRows, detectedColumns } = mapColumns(rawRows);
    const importRows = validateAndTransformRows(mappedRows);

    const validRows = importRows.filter((r) => r.property);
    const errorRows = importRows.filter((r) => r.errors.length > 0);

    if (validRows.length === 0) {
      return NextResponse.json({
        success: false,
        imported: 0,
        errors: errorRows.map((r) => ({
          row: r.rowNumber,
          errors: r.errors,
        })),
        detectedColumns,
      });
    }

    // Batch insert valid properties
    const propertiesToInsert = validRows.map((r) => ({
      organization_id: organizationId,
      ...r.property!,
    }));

    // Insert in batches of 50
    const batchSize = 50;
    let insertedCount = 0;
    const insertErrors: { row: number; errors: string[] }[] = [];

    for (let i = 0; i < propertiesToInsert.length; i += batchSize) {
      const batch = propertiesToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from("properties").insert(batch);

      if (error) {
        // Mark all rows in this batch as errors
        for (let j = 0; j < batch.length; j++) {
          const originalIndex = i + j;
          insertErrors.push({
            row: validRows[originalIndex].rowNumber,
            errors: [error.message],
          });
        }
      } else {
        insertedCount += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      imported: insertedCount,
      total: rawRows.length,
      errors: [
        ...errorRows.map((r) => ({ row: r.rowNumber, errors: r.errors })),
        ...insertErrors,
      ],
      detectedColumns,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Error procesando el archivo" },
      { status: 500 }
    );
  }
}
