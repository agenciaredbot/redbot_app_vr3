import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/match-opportunities
// Cron job that matches active opportunity_requests against available properties.
// Uses PostgreSQL FTS for matching — no external AI API needed.
//
// Vercel Cron config: run every 6 hours
// Add to vercel.json: { "crons": [{ "path": "/api/cron/match-opportunities", "schedule": "0 */6 * * *" }] }
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets CRON_SECRET automatically)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Fetch all active opportunity requests
  const { data: requests, error: reqError } = await adminSupabase
    .from("opportunity_requests")
    .select("*")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (reqError) {
    console.error("[cron/match-opportunities] Error fetching requests:", reqError);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  if (!requests || requests.length === 0) {
    return NextResponse.json({ matched: 0, message: "No active requests" });
  }

  let totalMatches = 0;

  for (const req of requests) {
    try {
      // Build a query to find matching properties from OTHER orgs
      let query = adminSupabase
        .from("properties")
        .select("id, title, organization_id, city, property_type, business_type, sale_price, rent_price, bedrooms, bathrooms, built_area_m2")
        .neq("organization_id", req.organization_id)
        .eq("is_published", true)
        .eq("availability", "disponible")
        .order("created_at", { ascending: false })
        .limit(10);

      // Apply filters based on request criteria
      if (req.property_type) {
        query = query.eq("property_type", req.property_type);
      }
      if (req.business_type) {
        query = query.eq("business_type", req.business_type);
      }
      if (req.city) {
        query = query.ilike("city", `%${req.city}%`);
      }
      if (req.min_price) {
        query = query.gte("sale_price", req.min_price);
      }
      if (req.max_price) {
        query = query.lte("sale_price", req.max_price);
      }
      if (req.min_bedrooms) {
        query = query.gte("bedrooms", req.min_bedrooms);
      }
      if (req.min_bathrooms) {
        query = query.gte("bathrooms", req.min_bathrooms);
      }
      if (req.min_area_m2) {
        query = query.gte("built_area_m2", req.min_area_m2);
      }

      const { data: matches } = await query;

      if (matches && matches.length > 0) {
        // Filter out properties that already have a shared_properties record with this org
        const matchIds = matches.map((m: any) => m.id);
        const { data: existingShares } = await adminSupabase
          .from("shared_properties")
          .select("property_id")
          .eq("requester_org_id", req.organization_id)
          .in("property_id", matchIds);

        const existingPropertyIds = new Set(
          (existingShares || []).map((s: any) => s.property_id)
        );

        const newMatches = matches.filter(
          (m: any) => !existingPropertyIds.has(m.id)
        );

        if (newMatches.length > 0) {
          // Create notification about new matches
          const matchSummary = newMatches
            .slice(0, 3)
            .map((m: any) => {
              const title =
                typeof m.title === "object" && m.title !== null
                  ? (m.title as Record<string, string>).es || "Propiedad"
                  : "Propiedad";
              return title;
            })
            .join(", ");

          await adminSupabase.from("notifications").insert({
            organization_id: req.organization_id,
            user_id: req.created_by,
            type: "reverse_request_match",
            title: `${newMatches.length} propiedad${newMatches.length > 1 ? "es" : ""} encontrada${newMatches.length > 1 ? "s" : ""}`,
            body: `Se encontraron propiedades que coinciden con tu solicitud "${req.title}": ${matchSummary}${newMatches.length > 3 ? ` y ${newMatches.length - 3} más` : ""}.`,
            metadata: {
              opportunity_request_id: req.id,
              match_count: newMatches.length,
              match_property_ids: newMatches.map((m: any) => m.id),
            },
          });

          totalMatches += newMatches.length;
        }
      }

      // Update last_matched_at regardless of whether matches were found
      await adminSupabase
        .from("opportunity_requests")
        .update({ last_matched_at: new Date().toISOString() })
        .eq("id", req.id);
    } catch (err) {
      console.error(`[cron/match-opportunities] Error processing request ${req.id}:`, err);
    }
  }

  // Expire old requests
  await adminSupabase
    .from("opportunity_requests")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  return NextResponse.json({
    matched: totalMatches,
    requestsProcessed: requests.length,
    message: `Processed ${requests.length} requests, found ${totalMatches} new matches`,
  });
}
