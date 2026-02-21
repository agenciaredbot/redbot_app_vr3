/**
 * Evolution API v2 — TypeScript Interfaces
 *
 * Based on Evolution API v2.3.x running on EasyPanel/Docker.
 * Auth: `apikey` header (global key or per-instance token).
 *
 * Docs: https://doc.evolution-api.com
 */

// ============================================================
// Instance Management
// ============================================================

export interface CreateInstanceParams {
  instanceName: string;
  /** Enable QR code generation on create */
  qrcode: boolean;
  /** Integration type — "WHATSAPP-BAILEYS" for WhatsApp Web */
  integration: "WHATSAPP-BAILEYS";
  /** Webhook URL for this instance */
  webhook?: {
    url: string;
    /** Which events to receive */
    events: WebhookEventType[];
    /** Send webhook by events (true) or all events (false) */
    webhook_by_events: boolean;
  };
}

export interface InstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: string; // per-instance token
  qrcode?: {
    base64: string;
    code: string;
  };
  settings?: Record<string, unknown>;
  webhook?: Record<string, unknown>;
}

export interface ConnectionStateResponse {
  instance: string;
  state: "open" | "close" | "connecting";
}

export interface QRCodeResponse {
  base64: string;
  code: string;
}

// ============================================================
// Messages
// ============================================================

export interface SendTextParams {
  number: string; // e.g. "573001234567" (no @s.whatsapp.net needed for sendText)
  text: string;
  delay?: number; // typing delay in ms
}

export interface SendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation: string;
  };
  messageTimestamp: string;
  status: string;
}

// ============================================================
// Webhook Events
// ============================================================

/** Events that Evolution API can send via webhooks */
export type WebhookEventType =
  | "MESSAGES_UPSERT"
  | "MESSAGES_UPDATE"
  | "MESSAGES_DELETE"
  | "SEND_MESSAGE"
  | "CONNECTION_UPDATE"
  | "QRCODE_UPDATED"
  | "CONTACTS_UPSERT"
  | "CONTACTS_UPDATE"
  | "PRESENCE_UPDATE"
  | "CHATS_UPSERT"
  | "CHATS_UPDATE"
  | "CHATS_DELETE"
  | "GROUPS_UPSERT"
  | "GROUPS_UPDATE"
  | "GROUP_PARTICIPANTS_UPDATE"
  | "CALL"
  | "NEW_JWT_TOKEN"
  | "TYPEBOT_START"
  | "TYPEBOT_CHANGE_STATUS";

/** Incoming message webhook payload */
export interface WebhookMessagePayload {
  event: "MESSAGES_UPSERT";
  instance: string;
  data: {
    key: {
      remoteJid: string; // e.g. "573001234567@s.whatsapp.net"
      fromMe: boolean;
      id: string;
    };
    pushName?: string; // WhatsApp display name
    message?: {
      conversation?: string; // plain text message
      extendedTextMessage?: {
        text: string;
      };
      imageMessage?: {
        caption?: string;
        url?: string;
      };
      audioMessage?: {
        url?: string;
      };
      documentMessage?: {
        title?: string;
        url?: string;
      };
      [key: string]: unknown;
    };
    messageType?: string; // "conversation", "extendedTextMessage", etc.
    messageTimestamp?: number;
  };
  destination?: string;
  date_time?: string;
  server_url?: string;
  apikey?: string;
}

/** Connection update webhook payload */
export interface WebhookConnectionPayload {
  event: "CONNECTION_UPDATE";
  instance: string;
  data: {
    state: "open" | "close" | "connecting";
  };
  destination?: string;
  date_time?: string;
  server_url?: string;
  apikey?: string;
}

/** QR Code updated webhook payload */
export interface WebhookQRCodePayload {
  event: "QRCODE_UPDATED";
  instance: string;
  data: {
    qrcode: {
      base64: string;
      code: string;
    };
  };
  destination?: string;
  date_time?: string;
  server_url?: string;
  apikey?: string;
}

/** Union type for all webhook payloads */
export type EvolutionWebhookPayload =
  | WebhookMessagePayload
  | WebhookConnectionPayload
  | WebhookQRCodePayload
  | { event: string; instance: string; data: unknown; [key: string]: unknown };

// ============================================================
// Internal Types (for Redbot)
// ============================================================

/** WhatsApp instance record from our DB */
export interface WhatsAppInstance {
  id: string;
  organization_id: string;
  instance_name: string;
  instance_token: string | null;
  connection_status: "disconnected" | "connecting" | "connected" | "failed";
  connected_phone: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  is_active: boolean;
  auto_reply: boolean;
  created_at: string;
  updated_at: string;
}
