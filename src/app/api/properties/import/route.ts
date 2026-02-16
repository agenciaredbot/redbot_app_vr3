import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseExcelBuffer,
  mapColumns,
  validateAndTransformRows,
  type PropertyInsertData,
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
    const contentType = request.headers.get("content-type") || "";

    let propertiesToInsert: (PropertyInsertData & {
      organization_id: string;
    })[];
    let totalCount: number;

    if (contentType.includes("application/json")) {
      // ─── JSON Mode (from preview wizard) ───
      const body = await request.json();
      const properties = body.properties as PropertyInsertData[];

      if (!properties || !Array.isArray(properties) || properties.length === 0) {
        return NextResponse.json(
          { error: "No se enviaron propiedades" },
          { status: 400 }
        );
      }

      if (properties.length > 500) {
        return NextResponse.json(
          { error: "Máximo 500 propiedades por importación" },
          { status: 400 }
        );
      }

      totalCount = properties.length;

      // Server-side duplicate detection by external_code
      const externalCodes = properties
        .map((p) => p.external_code)
        .filter((c): c is string => !!c);

      let existingCodes = new Set<string>();
      if (externalCodes.length > 0) {
        const { data: existing } = await supabase
          .from("properties")
          .select("external_code")
          .eq("organization_id", organizationId)
          .in("external_code", externalCodes);

        if (existing) {
          existingCodes = new Set(
            existing
              .map((r: { external_code: string | null }) => r.external_code)
              .filter(Boolean) as string[]
          );
        }
      }

      // Filter out duplicates and add org_id
      propertiesToInsert = properties
        .filter((p) => {
          if (p.external_code && existingCodes.has(p.external_code)) {
            return false;
          }
          return true;
        })
        .map((p) => ({
          organization_id: organizationId,
          ...p,
        }));

      const duplicateCount = totalCount - propertiesToInsert.length;

      if (propertiesToInsert.length === 0) {
        return NextResponse.json({
          success: true,
          imported: 0,
          total: totalCount,
          duplicatesSkipped: duplicateCount,
          errors: [],
        });
      }

      // Insert with batch + fallback strategy
      const { insertedCount, insertErrors } = await batchInsertWithFallback(
        supabase,
        propertiesToInsert as unknown as Record<string, unknown>[]
      );

      return NextResponse.json({
        success: true,
        imported: insertedCount,
        total: totalCount,
        duplicatesSkipped: duplicateCount,
        errors: insertErrors,
      });
    } else {
      // ─── FormData Mode (legacy / retrocompatible) ───
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No se envió archivo" },
          { status: 400 }
        );
      }

      const ext = file.name.toLowerCase().split(".").pop();
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (
        !allowedTypes.includes(file.type) &&
        !["xlsx", "xls", "csv"].includes(ext || "")
      ) {
        return NextResponse.json(
          {
            error:
              "Formato no soportado. Usa Excel (.xlsx/.xls) o CSV (.csv)",
          },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const { rows: rawRows } = parseExcelBuffer(buffer);

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

      const { mappedRows, columnMappings } = mapColumns(rawRows);
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
          detectedColumns: columnMappings.map((c) => c.mappedField),
        });
      }

      propertiesToInsert = validRows.map((r) => ({
        organization_id: organizationId,
        ...r.property!,
      }));

      totalCount = rawRows.length;

      const { insertedCount, insertErrors } = await batchInsertWithFallback(
        supabase,
        propertiesToInsert as unknown as Record<string, unknown>[]
      );

      return NextResponse.json({
        success: true,
        imported: insertedCount,
        total: totalCount,
        errors: [
          ...errorRows.map((r) => ({ row: r.rowNumber, errors: r.errors })),
          ...insertErrors,
        ],
        detectedColumns: columnMappings.map((c) => c.mappedField),
      });
    }
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Error procesando la importación" },
      { status: 500 }
    );
  }
}

/**
 * Batch insert with fallback: insert in batches of 10.
 * If a batch fails, retry each row individually to isolate the bad row.
 */
async function batchInsertWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  properties: Record<string, unknown>[]
): Promise<{
  insertedCount: number;
  insertErrors: { row: number; errors: string[] }[];
}> {
  const batchSize = 10;
  let insertedCount = 0;
  const insertErrors: { row: number; errors: string[] }[] = [];

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    const { error } = await supabase.from("properties").insert(batch);

    if (error) {
      // Batch failed — retry one by one to find the problematic row(s)
      for (let j = 0; j < batch.length; j++) {
        const singleRow = batch[j];
        const { error: singleError } = await supabase
          .from("properties")
          .insert(singleRow);

        if (singleError) {
          insertErrors.push({
            row: i + j + 2, // +2 for 1-based index + header row
            errors: [singleError.message],
          });
        } else {
          insertedCount++;
        }
      }
    } else {
      insertedCount += batch.length;
    }
  }

  return { insertedCount, insertErrors };
}
