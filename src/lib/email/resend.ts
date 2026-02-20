import { Resend } from "resend";

let _resend: Resend | null = null;

/**
 * Lazy-initialized Resend client.
 * Avoids throwing at import time if env var is missing (e.g. during build).
 */
export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY no está configurada");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL || "Redbot <notificaciones@redbot.app>";
