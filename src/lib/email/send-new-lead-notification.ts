import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, EMAIL_FROM } from "./resend";
import {
  buildNewLeadEmailHtml,
  buildNewLeadEmailSubject,
} from "./templates/new-lead";
import { LEAD_SOURCE_OPTIONS } from "@/config/constants";

interface LeadData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  budget: number | null;
  preferred_zones: string | null;
  timeline: string | null;
  property_summary: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Sends an email notification to all org_admin users of the organization
 * when a new lead is created. This function is designed to be called
 * fire-and-forget (non-blocking) after lead creation.
 */
export async function sendNewLeadNotification(
  organizationId: string,
  lead: LeadData
) {
  try {
    const adminClient = createAdminClient();

    // Fetch organization name and slug in parallel with admin emails
    const [orgResult, adminsResult] = await Promise.all([
      adminClient
        .from("organizations")
        .select("name, slug")
        .eq("id", organizationId)
        .single(),
      adminClient
        .from("user_profiles")
        .select("email")
        .eq("organization_id", organizationId)
        .eq("role", "org_admin")
        .eq("is_active", true),
    ]);

    if (orgResult.error || !orgResult.data) {
      console.error(
        "[Email] Error fetching organization:",
        orgResult.error?.message
      );
      return;
    }

    if (adminsResult.error || !adminsResult.data?.length) {
      console.error(
        "[Email] No admin emails found for org:",
        organizationId,
        adminsResult.error?.message
      );
      return;
    }

    const org = orgResult.data;
    const adminEmails = adminsResult.data.map(
      (a: { email: string }) => a.email
    );

    // Build the lead URL with deep-link query param
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://redbot.app";
    const baseUrl = appUrl.includes("localhost")
      ? `${appUrl}/admin/leads`
      : `https://${org.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app"}/admin/leads`;
    const leadUrl = `${baseUrl}?lead=${lead.id}`;

    // Resolve source label
    const sourceOption = LEAD_SOURCE_OPTIONS.find(
      (o) => o.value === lead.source
    );
    const sourceLabel = sourceOption?.label || lead.source || "Desconocido";

    const leadName = lead.full_name || "Sin nombre";

    const html = buildNewLeadEmailHtml({
      leadName,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      source: lead.source,
      sourceLabel,
      budget: lead.budget,
      preferredZones: lead.preferred_zones,
      timeline: lead.timeline,
      propertySummary: lead.property_summary,
      notes: lead.notes,
      organizationName: org.name,
      leadUrl,
      createdAt: lead.created_at,
    });

    const { error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: adminEmails,
      subject: buildNewLeadEmailSubject(leadName),
      html,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
    } else {
      console.log(
        `[Email] New lead notification sent to ${adminEmails.length} admin(s) for lead ${lead.id}`
      );
    }
  } catch (err) {
    console.error("[Email] Unexpected error sending lead notification:", err);
  }
}
