import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { leadCreateSchema } from "@/lib/validators/lead";
import { sendNewLeadNotification } from "@/lib/email/send-new-lead-notification";

export async function GET(request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const stage = searchParams.get("stage") || "";
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  // Advanced filter params
  const tags = searchParams.get("tags") || "";
  const source = searchParams.get("source") || "";
  const budgetMin = searchParams.get("budget_min") || "";
  const budgetMax = searchParams.get("budget_max") || "";
  const timeline = searchParams.get("timeline") || "";
  const preferredZones = searchParams.get("preferred_zones") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  // If tags filter is active, first find matching lead IDs via lead_tags
  let tagLeadIds: string[] | null = null;
  if (tags) {
    const tagIds = tags.split(",").filter(Boolean);
    if (tagIds.length > 0) {
      const { data: tagMatches } = await supabase
        .from("lead_tags")
        .select("lead_id")
        .in("tag_id", tagIds);

      if (tagMatches && tagMatches.length > 0) {
        // Deduplicate lead IDs
        tagLeadIds = [
          ...new Set(tagMatches.map((m: { lead_id: string }) => m.lead_id)),
        ];
      } else {
        // No leads match these tags — return empty result
        return NextResponse.json({
          leads: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    }
  }

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Basic filters
  if (stage) {
    query = query.eq("pipeline_stage", stage);
  }
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  // Tag filter: restrict to leads that matched
  if (tagLeadIds) {
    query = query.in("id", tagLeadIds);
  }

  // Advanced field filters
  if (source) {
    query = query.eq("source", source);
  }
  if (budgetMin) {
    query = query.gte("budget", parseInt(budgetMin));
  }
  if (budgetMax) {
    query = query.lte("budget", parseInt(budgetMax));
  }
  if (timeline) {
    query = query.eq("timeline", timeline);
  }
  if (preferredZones) {
    query = query.ilike("preferred_zones", `%${preferredZones}%`);
  }
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    // Include the entire end date
    query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.values(flat.fieldErrors)[0];
    const msg = (firstFieldError && firstFieldError[0]) || "Datos inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id: organizationId,
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      pipeline_stage: input.pipeline_stage || "nuevo",
      source: input.source || "manual",
      budget: input.budget || null,
      property_summary: input.property_summary || null,
      preferred_zones: input.preferred_zones || null,
      timeline: input.timeline || null,
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification to org admins (await to ensure it completes before lambda exits)
  await sendNewLeadNotification(organizationId, data);

  return NextResponse.json({ lead: data }, { status: 201 });
}
