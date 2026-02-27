import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, EMAIL_FROM } from "./resend";

type OpportunityNotificationType =
  | "opportunity_request"
  | "opportunity_approved"
  | "opportunity_rejected"
  | "reverse_request_match";

interface OpportunityEmailData {
  type: OpportunityNotificationType;
  targetOrgId: string;
  propertyTitle: string;
  sourceOrgName: string;
  message?: string | null;
  commissionPercent?: number | null;
  sharedPropertyId?: string;
  matchCount?: number;
}

/**
 * Sends email notification to org admins about opportunity events.
 * Designed to be called fire-and-forget (non-blocking).
 */
export async function sendOpportunityNotification(data: OpportunityEmailData) {
  try {
    const adminClient = createAdminClient();

    const [orgResult, adminsResult] = await Promise.all([
      adminClient
        .from("organizations")
        .select("name, slug")
        .eq("id", data.targetOrgId)
        .single(),
      adminClient
        .from("user_profiles")
        .select("email")
        .eq("organization_id", data.targetOrgId)
        .eq("role", "org_admin")
        .eq("is_active", true),
    ]);

    if (orgResult.error || !orgResult.data) {
      console.error("[Email] Error fetching org:", orgResult.error?.message);
      return;
    }

    if (adminsResult.error || !adminsResult.data?.length) {
      console.error("[Email] No admin emails for org:", data.targetOrgId);
      return;
    }

    const org = orgResult.data;
    const adminEmails = adminsResult.data.map((a: { email: string }) => a.email);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
    const isLocalhost = rootDomain.includes("localhost");
    const baseUrl = isLocalhost
      ? `http://${rootDomain}/admin/opportunities`
      : `https://${org.slug}.${rootDomain}/admin/opportunities`;

    const { subject, html } = buildOpportunityEmail({
      ...data,
      orgName: org.name,
      opportunitiesUrl: baseUrl,
    });

    const { error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: adminEmails,
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
    } else {
      console.log(
        `[Email] Opportunity notification (${data.type}) sent to ${adminEmails.length} admin(s)`
      );
    }
  } catch (err) {
    console.error("[Email] Unexpected error:", err);
  }
}

function buildOpportunityEmail(data: OpportunityEmailData & {
  orgName: string;
  opportunitiesUrl: string;
}) {
  const { type, propertyTitle, sourceOrgName, orgName, opportunitiesUrl, message, commissionPercent, matchCount } = data;

  let subject: string;
  let headline: string;
  let bodyText: string;
  let ctaText: string;

  switch (type) {
    case "opportunity_request":
      subject = `Nueva solicitud de compartir — ${sourceOrgName}`;
      headline = "Nueva Solicitud de Compartir";
      bodyText = `<strong>${sourceOrgName}</strong> quiere compartir tu propiedad <strong>"${propertyTitle}"</strong> en su portal.`;
      ctaText = "Ver Solicitud";
      break;
    case "opportunity_approved":
      subject = `Solicitud aprobada — ${propertyTitle}`;
      headline = "Solicitud Aprobada";
      bodyText = `<strong>${sourceOrgName}</strong> aprobó compartir <strong>"${propertyTitle}"</strong>. Ya puedes mostrarla en tu portal.`;
      ctaText = "Ver Oportunidades";
      break;
    case "opportunity_rejected":
      subject = `Solicitud rechazada — ${propertyTitle}`;
      headline = "Solicitud Rechazada";
      bodyText = `<strong>${sourceOrgName}</strong> rechazó compartir <strong>"${propertyTitle}"</strong>.`;
      ctaText = "Ver Oportunidades";
      break;
    case "reverse_request_match":
      subject = `${matchCount || 1} propiedad(es) encontrada(s) para tu solicitud`;
      headline = "Nuevas Propiedades Encontradas";
      bodyText = `Se encontraron <strong>${matchCount || 1} propiedad(es)</strong> que coinciden con tu solicitud <strong>"${propertyTitle}"</strong>.`;
      ctaText = "Ver Resultados";
      break;
  }

  if (message) {
    bodyText += `<br><br><em>Mensaje: "${message}"</em>`;
  }
  if (commissionPercent) {
    bodyText += `<br>Comisión propuesta: <strong>${commissionPercent}%</strong>`;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td style="background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:24px;font-weight:700;color:#ffffff;">Redbot</span>
          <span style="font-size:14px;color:rgba(255,255,255,0.4);margin-left:8px;">Oportunidades</span>
        </div>

        <!-- Headline -->
        <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 16px;text-align:center;">
          ${headline}
        </h1>

        <!-- Body -->
        <div style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin-bottom:24px;">
          <p style="margin:0 0 12px;">Hola <strong>${orgName}</strong>,</p>
          <p style="margin:0;">${bodyText}</p>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${opportunitiesUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
            ${ctaText}
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;text-align:center;">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">
            Este email fue enviado desde la plataforma Redbot.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
