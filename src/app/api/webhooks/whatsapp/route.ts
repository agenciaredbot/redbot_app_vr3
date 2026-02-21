import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSecret, sendTextMessage, extractMessageText, jidToPhone, fetchInstanceInfo } from "@/lib/evolution/client";
import { processMessage } from "@/lib/anthropic/process-message";
import {
  findOrCreateConversation,
  loadConversationHistory,
  persistMessages,
} from "@/lib/whatsapp/conversation-manager";
import { checkLimit, incrementConversationCountDirect } from "@/lib/plans/feature-gate";
import type {
  WebhookMessagePayload,
  WebhookConnectionPayload,
} from "@/lib/evolution/types";

export const maxDuration = 60;

/**
 * POST /api/webhooks/whatsapp — Evolution API webhook handler
 *
 * Receives events from Evolution API:
 * - MESSAGES_UPSERT: New incoming message → process with AI → reply
 * - CONNECTION_UPDATE: WhatsApp connection state changed
 * - QRCODE_UPDATED: New QR code generated (logged, QR shown via polling)
 *
 * No auth required — uses webhook secret verification.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const headerSecret = request.headers.get("x-webhook-secret");
    if (!verifyWebhookSecret(headerSecret)) {
      console.error("[wa-webhook] Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const event = body.event as string;
    const instanceName = body.instance as string;

    if (!event || !instanceName) {
      return NextResponse.json({ received: true });
    }

    console.log(`[wa-webhook] Event: ${event} | Instance: ${instanceName}`);

    switch (event) {
      case "MESSAGES_UPSERT":
        await handleIncomingMessage(body as WebhookMessagePayload);
        break;

      case "CONNECTION_UPDATE":
        await handleConnectionUpdate(body as WebhookConnectionPayload);
        break;

      case "QRCODE_UPDATED":
        // QR codes are fetched via polling in the UI — just log
        console.log(`[wa-webhook] QR updated for ${instanceName}`);
        break;

      default:
        console.log(`[wa-webhook] Unhandled event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[wa-webhook] Error:", err);
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}

// ============================================================
// Message Handler
// ============================================================

async function handleIncomingMessage(payload: WebhookMessagePayload) {
  const { instance: instanceName, data } = payload;

  // Skip messages sent by us (fromMe)
  if (data.key.fromMe) return;

  // Extract text content
  const messageText = extractMessageText(data.message as Record<string, unknown> | undefined);
  if (!messageText) {
    console.log("[wa-webhook] Non-text message, skipping");
    return;
  }

  const remoteJid = data.key.remoteJid;
  const contactName = data.pushName || undefined;

  // Skip group messages (only handle 1:1 chats)
  if (remoteJid.endsWith("@g.us")) {
    console.log("[wa-webhook] Group message, skipping");
    return;
  }

  const supabase = createAdminClient();

  // ── Resolve organization from instance_name ──
  const { data: waInstance } = await supabase
    .from("whatsapp_instances")
    .select("id, organization_id, instance_name, is_active, auto_reply, connection_status")
    .eq("instance_name", instanceName)
    .single();

  if (!waInstance) {
    console.error(`[wa-webhook] Unknown instance: ${instanceName}`);
    return;
  }

  if (!waInstance.is_active || !waInstance.auto_reply) {
    console.log(`[wa-webhook] Instance ${instanceName} is inactive or auto_reply disabled`);
    return;
  }

  const organizationId = waInstance.organization_id;

  // ── Get org context for AI ──
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, agent_name, agent_personality, city, country")
    .eq("id", organizationId)
    .single();

  if (!org) {
    console.error(`[wa-webhook] Org not found for ${instanceName}`);
    return;
  }

  // ── Find or create conversation ──
  const conversation = await findOrCreateConversation(
    organizationId,
    remoteJid,
    contactName
  );

  // ── Check conversation limit (only for new conversations) ──
  if (conversation.message_count === 0) {
    const limitCheck = await checkLimit(organizationId, "conversations");
    if (!limitCheck.allowed) {
      console.warn(`[wa-webhook] Conversation limit reached for org ${organizationId}`);
      // Send a polite limit message
      await sendTextMessage(
        instanceName,
        remoteJid,
        "Lo siento, en este momento no puedo atender nuevas conversaciones. Por favor, intenta más tarde o comunícate directamente con nosotros."
      );
      return;
    }
    await incrementConversationCountDirect(organizationId);
  }

  // ── Load conversation history ──
  const history = await loadConversationHistory(conversation.id, 20);

  // Add the new user message
  const messages = [
    ...history,
    { role: "user" as const, content: messageText },
  ];

  // ── Process with Claude AI ──
  const phone = jidToPhone(remoteJid);

  try {
    const result = await processMessage({
      messages,
      organizationId,
      orgSlug: org.slug,
      orgContext: {
        name: org.name,
        slug: org.slug,
        agent_name: org.agent_name,
        agent_personality: org.agent_personality,
        city: org.city,
        country: org.country,
      },
      channel: "whatsapp",
      conversationId: conversation.id,
      channelContext: { phone },
    });

    if (!result.responseText) {
      console.error("[wa-webhook] Empty AI response");
      return;
    }

    // ── Send response via WhatsApp ──
    await sendTextMessage(instanceName, remoteJid, result.responseText);

    // ── Persist messages ──
    await persistMessages(
      conversation.id,
      messageText,
      result.responseText,
      result.toolsUsed
    );

    console.log(
      `[wa-webhook] Replied to ${remoteJid} via ${instanceName} | Tools: ${result.toolsUsed.join(", ") || "none"}`
    );
  } catch (err) {
    console.error("[wa-webhook] AI processing error:", err);
    // Send error message to user
    try {
      await sendTextMessage(
        instanceName,
        remoteJid,
        "Disculpa, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo?"
      );
    } catch {
      // Best effort — don't fail silently on the error message
    }
  }
}

// ============================================================
// Connection Update Handler
// ============================================================

async function handleConnectionUpdate(payload: WebhookConnectionPayload) {
  const { instance: instanceName, data } = payload;
  const state = data.state;

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};

  switch (state) {
    case "open":
      updates.connection_status = "connected";
      updates.connected_at = new Date().toISOString();
      updates.disconnected_at = null;

      // Try to fetch the connected phone number
      try {
        const info = await fetchInstanceInfo(instanceName);
        if (info.ownerJid) {
          updates.connected_phone = jidToPhone(info.ownerJid);
          console.log(`[wa-webhook] Connected phone: ${updates.connected_phone}`);
        }
      } catch (phoneErr) {
        console.warn("[wa-webhook] Could not fetch phone number:", phoneErr);
      }
      break;
    case "close":
      updates.connection_status = "disconnected";
      updates.disconnected_at = new Date().toISOString();
      break;
    case "connecting":
      updates.connection_status = "connecting";
      break;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("whatsapp_instances")
      .update(updates)
      .eq("instance_name", instanceName);

    if (error) {
      console.error(`[wa-webhook] Error updating connection status:`, error.message);
    } else {
      console.log(`[wa-webhook] ${instanceName} connection: ${state}`);
    }
  }
}
