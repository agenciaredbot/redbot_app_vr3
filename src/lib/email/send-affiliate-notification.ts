import { getResend, EMAIL_FROM } from "./resend";

type AffiliateNotificationType =
  | "affiliate_welcome"
  | "affiliate_approved"
  | "commission_earned"
  | "payout_processed";

interface AffiliateEmailData {
  type: AffiliateNotificationType;
  email: string;
  displayName: string;
  referralCode?: string;
  commissionAmount?: string;
  payoutAmount?: string;
  planName?: string;
  referredOrgName?: string;
}

/**
 * Send email notification to an affiliate.
 * Fire-and-forget pattern (non-blocking).
 */
export async function sendAffiliateNotification(data: AffiliateEmailData) {
  try {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
    const isLocalhost = rootDomain.includes("localhost");
    const baseUrl = isLocalhost ? `http://${rootDomain}` : `https://${rootDomain}`;

    const { subject, html } = buildAffiliateEmail({ ...data, baseUrl });

    const { error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: [data.email],
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
    } else {
      console.log(`[Email] Affiliate notification (${data.type}) sent to ${data.email}`);
    }
  } catch (err) {
    console.error("[Email] Unexpected error:", err);
  }
}

function buildAffiliateEmail(
  data: AffiliateEmailData & { baseUrl: string }
) {
  const { type, displayName, baseUrl, referralCode, commissionAmount, payoutAmount, planName, referredOrgName } = data;

  let subject: string;
  let headline: string;
  let bodyText: string;
  let ctaText: string;
  let ctaUrl: string;

  switch (type) {
    case "affiliate_welcome":
      subject = "Bienvenido al Programa de Afiliados — Redbot";
      headline = "Bienvenido al Programa de Afiliados";
      bodyText = "Tu solicitud ha sido recibida y está siendo revisada por nuestro equipo. Te notificaremos cuando sea aprobada.";
      ctaText = "Ver estado";
      ctaUrl = `${baseUrl}/admin/afiliados`;
      break;
    case "affiliate_approved":
      subject = "Tu cuenta de afiliado ha sido aprobada — Redbot";
      headline = "Cuenta Aprobada";
      bodyText = `Tu cuenta de afiliado ha sido aprobada. Tu código de referido es: <strong>${referralCode}</strong>. Comparte tu link y empieza a ganar comisiones recurrentes.`;
      ctaText = "Ir a mi panel de afiliado";
      ctaUrl = `${baseUrl}/admin/afiliados`;
      break;
    case "commission_earned":
      subject = `Nueva comisión: ${commissionAmount} COP — Redbot`;
      headline = "Nueva Comisión Generada";
      bodyText = `Se ha generado una comisión de <strong>${commissionAmount} COP</strong> por el pago mensual de <strong>${referredOrgName}</strong> (plan ${planName}).`;
      ctaText = "Ver mis comisiones";
      ctaUrl = `${baseUrl}/admin/afiliados`;
      break;
    case "payout_processed":
      subject = `Pago procesado: ${payoutAmount} COP — Redbot`;
      headline = "Pago Procesado";
      bodyText = `Se ha procesado un pago de <strong>${payoutAmount} COP</strong> a tu cuenta. Revisa tu historial de pagos para más detalles.`;
      ctaText = "Ver historial de pagos";
      ctaUrl = `${baseUrl}/admin/afiliados`;
      break;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td style="background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:24px;font-weight:700;color:#ffffff;">Redbot</span>
          <span style="font-size:14px;color:rgba(255,255,255,0.4);margin-left:8px;">Afiliados</span>
        </div>
        <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 16px;text-align:center;">
          ${headline}
        </h1>
        <div style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin-bottom:24px;">
          <p style="margin:0 0 12px;">Hola <strong>${displayName}</strong>,</p>
          <p style="margin:0;">${bodyText}</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${ctaUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
            ${ctaText}
          </a>
        </div>
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
