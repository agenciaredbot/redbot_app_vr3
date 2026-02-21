/**
 * Evolution API v2 HTTP Client
 *
 * Handles communication with the Evolution API server.
 * All requests require the global API key in the `apikey` header.
 *
 * Server URL and API key come from environment variables:
 * - EVOLUTION_API_URL: Base URL (e.g. https://evolution-api.example.com)
 * - EVOLUTION_API_KEY: Global authentication key
 */

import type {
  InstanceResponse,
  ConnectionStateResponse,
  QRCodeResponse,
  SendTextResponse,
  WebhookEventType,
} from "./types";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

// Webhook URL where Evolution sends events to our app
const WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://redbot.app";

// Secret token to verify incoming webhooks (optional extra security)
const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET || "";

// ============================================================
// Base HTTP helper
// ============================================================

async function evoRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!EVOLUTION_API_URL) {
    throw new Error("EVOLUTION_API_URL no está configurada");
  }
  if (!EVOLUTION_API_KEY) {
    throw new Error("EVOLUTION_API_KEY no está configurada");
  }

  // Remove trailing slash from base URL
  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...options.headers,
    },
  });

  // Some endpoints return empty body (204)
  if (res.status === 204) {
    return {} as T;
  }

  const data = await res.json();

  if (!res.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      `Evolution API error: ${res.status}`;
    console.error("[evolution] API error:", {
      status: res.status,
      path,
      data,
    });
    throw new Error(errorMsg);
  }

  return data as T;
}

// ============================================================
// Instance Management
// ============================================================

/**
 * Create a new WhatsApp instance in Evolution API.
 * The instance starts disconnected — use connectInstance() to get QR.
 */
export async function createInstance(
  instanceName: string
): Promise<InstanceResponse> {
  const webhookEvents: WebhookEventType[] = [
    "MESSAGES_UPSERT",
    "CONNECTION_UPDATE",
    "QRCODE_UPDATED",
  ];

  const body = {
    instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    webhook: {
      url: `${WEBHOOK_BASE_URL}/api/webhooks/whatsapp`,
      webhook_by_events: true,
      webhook_base64: false,
      events: webhookEvents,
      ...(WEBHOOK_SECRET && { headers: { "x-webhook-secret": WEBHOOK_SECRET } }),
    },
    // Reject calls automatically (bot shouldn't receive calls)
    rejectCall: true,
    msgCall: "Lo siento, no puedo recibir llamadas. Por favor, envía un mensaje de texto.",
  };

  return evoRequest<InstanceResponse>("/instance/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Connect an existing instance (generates QR code).
 * Returns base64 QR image for scanning.
 */
export async function connectInstance(
  instanceName: string
): Promise<QRCodeResponse> {
  return evoRequest<QRCodeResponse>(
    `/instance/connect/${instanceName}`
  );
}

/**
 * Get the current connection state of an instance.
 */
export async function getConnectionState(
  instanceName: string
): Promise<ConnectionStateResponse> {
  return evoRequest<ConnectionStateResponse>(
    `/instance/connectionState/${instanceName}`
  );
}

/**
 * Logout (disconnect) a WhatsApp instance.
 * Keeps the instance but disconnects the phone.
 */
export async function logoutInstance(
  instanceName: string
): Promise<void> {
  await evoRequest<unknown>(`/instance/logout/${instanceName}`, {
    method: "DELETE",
  });
}

/**
 * Delete a WhatsApp instance completely.
 */
export async function deleteInstance(
  instanceName: string
): Promise<void> {
  await evoRequest<unknown>(`/instance/delete/${instanceName}`, {
    method: "DELETE",
  });
}

/**
 * Restart a WhatsApp instance.
 */
export async function restartInstance(
  instanceName: string
): Promise<void> {
  await evoRequest<unknown>(`/instance/restart/${instanceName}`, {
    method: "PUT",
  });
}

// ============================================================
// Messaging
// ============================================================

/**
 * Send a plain text message to a WhatsApp number.
 *
 * @param instanceName - Evolution instance name (e.g. "redbot-proper-home")
 * @param number - Phone number (e.g. "573001234567") or JID
 * @param text - Message text content
 */
export async function sendTextMessage(
  instanceName: string,
  number: string,
  text: string
): Promise<SendTextResponse> {
  // Strip @s.whatsapp.net if present — Evolution handles it
  const cleanNumber = number.replace(/@s\.whatsapp\.net$/, "");

  return evoRequest<SendTextResponse>(
    `/message/sendText/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: cleanNumber,
        text,
        delay: 1000, // 1s typing delay for natural feel
      }),
    }
  );
}

// ============================================================
// Webhook Verification
// ============================================================

/**
 * Verify that an incoming webhook request is from our Evolution API.
 * Uses the x-webhook-secret header if configured.
 */
export function verifyWebhookSecret(
  headerSecret: string | null
): boolean {
  if (!WEBHOOK_SECRET) {
    // No secret configured — accept all (rely on URL obscurity)
    return true;
  }
  return headerSecret === WEBHOOK_SECRET;
}

// ============================================================
// Utility
// ============================================================

/**
 * Generate a standardized instance name for an organization.
 * Format: "redbot-{orgSlug}"
 */
export function buildInstanceName(orgSlug: string): string {
  return `redbot-${orgSlug}`;
}

/**
 * Extract phone number from WhatsApp JID.
 * "573001234567@s.whatsapp.net" → "+573001234567"
 */
export function jidToPhone(jid: string): string {
  const number = jid.split("@")[0];
  return `+${number}`;
}

/**
 * Extract the message text from various WhatsApp message types.
 */
export function extractMessageText(
  message: Record<string, unknown> | undefined
): string | null {
  if (!message) return null;

  // Plain text
  if (message.conversation && typeof message.conversation === "string") {
    return message.conversation;
  }

  // Extended text (replies, links, etc.)
  const extended = message.extendedTextMessage as
    | { text?: string }
    | undefined;
  if (extended?.text) {
    return extended.text;
  }

  // Image with caption
  const imageMsg = message.imageMessage as
    | { caption?: string }
    | undefined;
  if (imageMsg?.caption) {
    return imageMsg.caption;
  }

  return null;
}
