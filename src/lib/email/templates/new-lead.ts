interface NewLeadEmailData {
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  source: string | null;
  sourceLabel: string;
  budget: number | null;
  preferredZones: string | null;
  timeline: string | null;
  propertySummary: string | null;
  notes: string | null;
  organizationName: string;
  leadUrl: string;
  createdAt: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function buildNewLeadEmailHtml(data: NewLeadEmailData): string {
  const contactRows: string[] = [];

  if (data.leadEmail) {
    contactRows.push(`
      <tr>
        <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Email</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:14px;">
          <a href="mailto:${data.leadEmail}" style="color:#60a5fa;text-decoration:none;">${data.leadEmail}</a>
        </td>
      </tr>
    `);
  }

  if (data.leadPhone) {
    contactRows.push(`
      <tr>
        <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Teléfono</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:14px;">
          <a href="tel:${data.leadPhone}" style="color:#60a5fa;text-decoration:none;">${data.leadPhone}</a>
        </td>
      </tr>
    `);
  }

  contactRows.push(`
    <tr>
      <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Fuente</td>
      <td style="padding:6px 12px;color:#e2e8f0;font-size:14px;">${data.sourceLabel}</td>
    </tr>
  `);

  contactRows.push(`
    <tr>
      <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Fecha</td>
      <td style="padding:6px 12px;color:#e2e8f0;font-size:14px;">${formatDate(data.createdAt)}</td>
    </tr>
  `);

  // Search profile section
  const profileRows: string[] = [];

  if (data.budget) {
    profileRows.push(`
      <tr>
        <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Presupuesto</td>
        <td style="padding:6px 12px;color:#10b981;font-size:14px;font-weight:600;">${formatCurrency(data.budget)}</td>
      </tr>
    `);
  }

  if (data.preferredZones) {
    profileRows.push(`
      <tr>
        <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Zonas</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:14px;">${data.preferredZones}</td>
      </tr>
    `);
  }

  if (data.timeline) {
    profileRows.push(`
      <tr>
        <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Plazo</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:14px;">${data.timeline}</td>
      </tr>
    `);
  }

  if (data.propertySummary) {
    profileRows.push(`
      <tr>
        <td style="padding:6px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;">Busca</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:14px;">${data.propertySummary}</td>
      </tr>
    `);
  }

  const profileSection =
    profileRows.length > 0
      ? `
    <div style="margin-top:20px;">
      <h3 style="color:#f8fafc;font-size:14px;margin:0 0 8px 0;font-weight:600;">Perfil de búsqueda</h3>
      <table role="presentation" style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;">
        ${profileRows.join("")}
      </table>
    </div>
  `
      : "";

  const notesSection = data.notes
    ? `
    <div style="margin-top:20px;">
      <h3 style="color:#f8fafc;font-size:14px;margin:0 0 8px 0;font-weight:600;">Notas</h3>
      <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;color:#cbd5e1;font-size:13px;line-height:1.5;">
        ${data.notes}
      </div>
    </div>
  `
    : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nuevo Lead - ${data.organizationName}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);padding:10px 20px;border-radius:12px;">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Redbot</span>
      </div>
    </div>

    <!-- Main card -->
    <div style="background:linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;backdrop-filter:blur(20px);">

      <!-- Title -->
      <div style="margin-bottom:20px;">
        <div style="display:inline-block;background:rgba(59,130,246,0.15);color:#60a5fa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:4px 10px;border-radius:6px;margin-bottom:10px;">
          Nuevo Lead
        </div>
        <h1 style="color:#f8fafc;font-size:22px;margin:8px 0 4px 0;font-weight:700;">${data.leadName}</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">${data.organizationName}</p>
      </div>

      <!-- Contact info -->
      <table role="presentation" style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;">
        ${contactRows.join("")}
      </table>

      ${profileSection}
      ${notesSection}

      <!-- CTA Button -->
      <div style="text-align:center;margin-top:28px;">
        <a href="${data.leadUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
          Ver lead completo
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;color:#475569;font-size:11px;line-height:1.6;">
      <p style="margin:0;">Este email fue enviado automáticamente por Redbot.</p>
      <p style="margin:4px 0 0 0;">Recibes esta notificación porque eres administrador de ${data.organizationName}.</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export function buildNewLeadEmailSubject(leadName: string): string {
  return `Nuevo lead: ${leadName}`;
}
