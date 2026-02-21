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

/**
 * Raw request helper — returns parsed JSON without type assertions.
 * Used internally for debugging and flexible parsing.
 */
async function evoRequestRaw(
  path: string,
  options: RequestInit = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!EVOLUTION_API_URL) {
    throw new Error("EVOLUTION_API_URL no está configurada");
  }
  if (!EVOLUTION_API_KEY) {
    throw new Error("EVOLUTION_API_KEY no está configurada");
  }

  // Remove trailing slash from base URL
  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
  const url = `${baseUrl}${path}`;

  console.log(`[evolution] → ${options.method || "GET"} ${path}`);

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
    console.log(`[evolution] ← 204 No Content`);
    return {};
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
      data: JSON.stringify(data).slice(0, 500),
    });
    throw new Error(errorMsg);
  }

  // Log successful response (truncated for readability)
  console.log(
    `[evolution] ← ${res.status} ${path}:`,
    JSON.stringify(data).slice(0, 300)
  );

  return data;
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
      webhookByEvents: false,
      webhookBase64: false,
      events: webhookEvents,
      ...(WEBHOOK_SECRET && { headers: { "x-webhook-secret": WEBHOOK_SECRET } }),
    },
    // Reject calls automatically (bot shouldn't receive calls)
    rejectCall: true,
    msgCall: "Lo siento, no puedo recibir llamadas. Por favor, envía un mensaje de texto.",
  };

  const data = await evoRequestRaw("/instance/create", {
    method: "POST",
    body: JSON.stringify(body),
  });

  // Normalize response — Evolution API may return different structures
  const result: InstanceResponse = {
    instance: data.instance || { instanceName, instanceId: "", status: "created" },
    hash: data.hash || data.token || "",
    qrcode: undefined,
    settings: data.settings,
    webhook: data.webhook,
  };

  // QR code can come in different locations depending on API version
  if (data.qrcode?.base64) {
    result.qrcode = data.qrcode;
  } else if (data.qrcode?.pairingCode) {
    // Some versions use pairingCode instead of base64
    result.qrcode = { base64: data.qrcode.pairingCode, code: data.qrcode.code || "" };
  }

  console.log(
    `[evolution] createInstance result: hasQR=${!!result.qrcode}, hash=${result.hash ? "yes" : "no"}`
  );

  return result;
}

/**
 * Connect an existing instance (generates QR code).
 * Returns base64 QR image for scanning.
 */
export async function connectInstance(
  instanceName: string
): Promise<QRCodeResponse> {
  const data = await evoRequestRaw(`/instance/connect/${instanceName}`);

  // Normalize response — handle different structures
  // Could be: { base64: "...", code: "..." }
  // Or:       { qrcode: { base64: "...", code: "..." } }
  // Or:       { pairingCode: "...", code: "..." }
  const qr: QRCodeResponse = {
    base64: data.base64 || data.qrcode?.base64 || data.pairingCode || "",
    code: data.code || data.qrcode?.code || "",
  };

  if (!qr.base64) {
    console.warn("[evolution] connectInstance: no QR base64 in response:", JSON.stringify(data).slice(0, 300));
  }

  return qr;
}

/**
 * Get the current connection state of an instance.
 * Handles multiple response formats from Evolution API.
 */
export async function getConnectionState(
  instanceName: string
): Promise<ConnectionStateResponse> {
  const data = await evoRequestRaw(`/instance/connectionState/${instanceName}`);

  // Normalize response — handle different structures:
  // Format 1: { instance: "name", state: "open" }
  // Format 2: { state: "open" }
  // Format 3: { instance: { state: "open" } }
  // Format 4: Array response: [{ instance: "name", state: "open" }]

  let state: string;

  if (Array.isArray(data)) {
    // Array format — take first element
    state = data[0]?.state || "close";
  } else if (typeof data.state === "string") {
    state = data.state;
  } else if (typeof data.state === "object" && data.state?.state) {
    state = data.state.state;
  } else if (typeof data.instance === "object" && data.instance?.state) {
    state = data.instance.state;
  } else {
    console.warn("[evolution] getConnectionState: unexpected format:", JSON.stringify(data).slice(0, 300));
    state = "close";
  }

  // Normalize state values
  const normalizedState = normalizeConnectionState(state);

  return {
    instance: typeof data.instance === "string" ? data.instance : instanceName,
    state: normalizedState,
  };
}

/**
 * Normalize connection state to our expected values.
 * Evolution API might return various state strings.
 */
function normalizeConnectionState(state: string): "open" | "close" | "connecting" {
  const s = state.toLowerCase();
  if (s === "open" || s === "connected") return "open";
  if (s === "close" || s === "closed" || s === "disconnected") return "close";
  if (s === "connecting") return "connecting";
  console.warn(`[evolution] Unknown connection state: "${state}", treating as "close"`);
  return "close";
}

/**
 * Fetch instance info including connected phone number.
 * Uses /instance/fetchInstances endpoint.
 */
export async function fetchInstanceInfo(
  instanceName: string
): Promise<{ ownerJid?: string; profileName?: string }> {
  try {
    const data = await evoRequestRaw(`/instance/fetchInstances?instanceName=${instanceName}`);

    // Response can be array or object
    const instance = Array.isArray(data) ? data[0] : data;

    return {
      ownerJid: instance?.instance?.owner || instance?.owner || undefined,
      profileName: instance?.instance?.profileName || instance?.profileName || undefined,
    };
  } catch (err) {
    console.warn("[evolution] fetchInstanceInfo error:", err);
    return {};
  }
}

/**
 * Logout (disconnect) a WhatsApp instance.
 * Keeps the instance but disconnects the phone.
 */
export async function logoutInstance(
  instanceName: string
): Promise<void> {
  await evoRequestRaw(`/instance/logout/${instanceName}`, {
    method: "DELETE",
  });
}

/**
 * Delete a WhatsApp instance completely.
 */
export async function deleteInstance(
  instanceName: string
): Promise<void> {
  await evoRequestRaw(`/instance/delete/${instanceName}`, {
    method: "DELETE",
  });
}

/**
 * Restart a WhatsApp instance.
 */
export async function restartInstance(
  instanceName: string
): Promise<void> {
  await evoRequestRaw(`/instance/restart/${instanceName}`, {
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
  // Strip @s.whatsapp.net and @lid if present — Evolution expects clean number
  const cleanNumber = number.replace(/@(s\.whatsapp\.net|lid)$/, "");

  console.log(`[evolution] sendTextMessage: instance=${instanceName}, to=${cleanNumber}, textLen=${text.length}`);

  const result = await evoRequestRaw(
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

  console.log(`[evolution] sendTextMessage result: ${JSON.stringify(result).slice(0, 200)}`);
  return result;
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
 * Also handles @lid format and already-prefixed numbers.
 */
export function jidToPhone(jid: string): string {
  const number = jid.split("@")[0];
  return number.startsWith("+") ? number : `+${number}`;
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
