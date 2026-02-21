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
  const startTime = Date.now();

  try {
    // Verify webhook secret
    const headerSecret = request.headers.get("x-webhook-secret");
    if (!verifyWebhookSecret(headerSecret)) {
      console.error("[wa-webhook] Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Log the incoming webhook body (truncated for readability)
    console.log(`[wa-webhook] Incoming:`, JSON.stringify(body).slice(0, 500));

    const rawEvent = body.event as string;
    const instanceName = body.instance as string;

    if (!rawEvent || !instanceName) {
      console.warn("[wa-webhook] Missing event or instance in body");
      return NextResponse.json({ received: true });
    }

    // Normalize event name: Evolution API sends different formats depending on config:
    //   webhookByEvents: true  → "MESSAGES_UPSERT"   (uppercase, underscore)
    //   webhookByEvents: false → "messages.upsert"    (lowercase, dot)
    //   some versions          → "messages_upsert"    (lowercase, underscore)
    const event = rawEvent.toUpperCase().replace(/\./g, "_");

    console.log(`[wa-webhook] Event: ${rawEvent} → ${event} | Instance: ${instanceName}`);

    switch (event) {
      case "MESSAGES_UPSERT":
        await handleIncomingMessage(body as WebhookMessagePayload);
        break;

      case "CONNECTION_UPDATE":
        await handleConnectionUpdate(body as WebhookConnectionPayload);
        break;

      case "QRCODE_UPDATED":
        console.log(`[wa-webhook] QR updated for ${instanceName}`);
        break;

      default:
        console.log(`[wa-webhook] Unhandled event: ${rawEvent} (normalized: ${event})`);
    }

    console.log(`[wa-webhook] Request completed in ${Date.now() - startTime}ms`);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[wa-webhook] TOP-LEVEL ERROR (after ${Date.now() - startTime}ms):`, err instanceof Error ? err.stack : err);
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}

// ============================================================
// Message Handler
// ============================================================

async function handleIncomingMessage(payload: WebhookMessagePayload) {
  const { instance: instanceName, data } = payload;

  // Skip messages sent by us (fromMe)
  if (data.key.fromMe) {
    console.log("[wa-webhook] Skipping fromMe message");
    return;
  }

  // Extract text content
  const messageText = extractMessageText(data.message as Record<string, unknown> | undefined);
  if (!messageText) {
    console.log(`[wa-webhook] Non-text message (type: ${data.messageType || "unknown"}), skipping`);
    return;
  }

  // Resolve remoteJid — handle @lid (Linked ID) format from WhatsApp Business
  let remoteJid = data.key.remoteJid;

  console.log(`[wa-webhook] Raw remoteJid: ${remoteJid}`);

  if (remoteJid.endsWith("@lid")) {
    // Evolution API v2+ may use @lid format with remoteJidAlt for the real JID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyData = data.key as any;
    const altJid = (keyData.remoteJidAlt || keyData.participant) as string | undefined;
    console.log(`[wa-webhook] @lid detected. remoteJidAlt=${altJid || "NONE"}, participant=${keyData.participant || "NONE"}`);

    if (altJid && altJid.endsWith("@s.whatsapp.net")) {
      console.log(`[wa-webhook] Resolved @lid → ${altJid}`);
      remoteJid = altJid;
    } else {
      console.warn(`[wa-webhook] @lid JID without valid alternative: ${remoteJid}, skipping. Full key: ${JSON.stringify(data.key).slice(0, 300)}`);
      return;
    }
  }

  const contactName = data.pushName || undefined;

  // Skip group messages (only handle 1:1 chats)
  if (remoteJid.endsWith("@g.us")) {
    console.log("[wa-webhook] Group message, skipping");
    return;
  }

  console.log(`[wa-webhook] Processing: "${messageText.slice(0, 80)}" from ${remoteJid} (${contactName || "unknown"})`);

  const supabase = createAdminClient();

  // ── Resolve organization from instance_name ──
  const { data: waInstance, error: instanceError } = await supabase
    .from("whatsapp_instances")
    .select("id, organization_id, instance_name, is_active, auto_reply, connection_status")
    .eq("instance_name", instanceName)
    .single();

  if (!waInstance) {
    console.error(`[wa-webhook] Unknown instance: "${instanceName}" | DB error: ${instanceError?.message || "no row"}`);
    return;
  }

  console.log(`[wa-webhook] Instance found: id=${waInstance.id}, active=${waInstance.is_active}, auto_reply=${waInstance.auto_reply}, status=${waInstance.connection_status}`);

  if (!waInstance.is_active || !waInstance.auto_reply) {
    console.log(`[wa-webhook] Instance ${instanceName} is inactive or auto_reply disabled, skipping`);
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
    console.error(`[wa-webhook] Org not found for org_id=${organizationId}`);
    return;
  }

  console.log(`[wa-webhook] Org: ${org.slug} (${org.name}), agent=${org.agent_name}`);

  // ── Find or create conversation ──
  let conversation;
  try {
    conversation = await findOrCreateConversation(
      organizationId,
      remoteJid,
      contactName
    );
    console.log(`[wa-webhook] Conversation: ${conversation.id} (msgs: ${conversation.message_count})`);
  } catch (convErr) {
    console.error(`[wa-webhook] FATAL: findOrCreateConversation failed:`, convErr instanceof Error ? convErr.stack : convErr);
    return;
  }

  // ── Check conversation limit (only for new conversations) ──
  if (conversation.message_count === 0) {
    const limitCheck = await checkLimit(organizationId, "conversations");
    if (!limitCheck.allowed) {
      console.warn(`[wa-webhook] Conversation limit reached for org ${organizationId}`);
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

  console.log(`[wa-webhook] History loaded: ${history.length} messages. Roles: ${history.map(m => m.role).join(",")}`);

  // Add the new user message
  const messages = [
    ...history,
    { role: "user" as const, content: messageText },
  ];

  // Safety check: Claude requires user/assistant alternation
  // loadConversationHistory should ensure this, but double-check
  if (history.length > 0 && history[history.length - 1].role === "user") {
    console.warn(`[wa-webhook] BUG: History ends with 'user' role — removing to prevent consecutive user messages`);
    // Remove the history's trailing user message so we don't have user,user
    messages.splice(messages.length - 2, 1);
  }

  console.log(`[wa-webhook] Final messages count: ${messages.length}. Roles: ${messages.map(m => m.role).join(",")}`);

  // ── Process with Claude AI ──
  const phone = jidToPhone(remoteJid);

  try {
    console.log(`[wa-webhook] Calling processMessage for org=${org.slug}, phone=${phone}, msgs=${messages.length}...`);

    // Wrap processMessage in a timeout to prevent hanging
    const AI_TIMEOUT_MS = 50_000; // 50s (leave margin for the 60s maxDuration)
    const result = await Promise.race([
      processMessage({
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI processing timed out after 50s")), AI_TIMEOUT_MS)
      ),
    ]);

    console.log(`[wa-webhook] AI response (${result.responseText?.length || 0} chars): "${result.responseText?.slice(0, 120) || "(empty)"}" | Tools: ${result.toolsUsed.join(", ") || "none"}`);

    if (!result.responseText) {
      console.error("[wa-webhook] Empty AI response — no text to send");
      return;
    }

    // ── Send response via WhatsApp ──
    console.log(`[wa-webhook] Sending reply to ${remoteJid} via instance ${instanceName}...`);
    const sendResult = await sendTextMessage(instanceName, remoteJid, result.responseText);
    console.log(`[wa-webhook] Reply sent successfully. Evolution response: ${JSON.stringify(sendResult).slice(0, 200)}`);

    // ── Persist messages ──
    await persistMessages(
      conversation.id,
      messageText,
      result.responseText,
      result.toolsUsed
    );

    console.log(
      `[wa-webhook] ✅ Complete: replied to ${remoteJid} via ${instanceName} | Tools: ${result.toolsUsed.join(", ") || "none"}`
    );
  } catch (err) {
    console.error("[wa-webhook] AI/Send ERROR:", err instanceof Error ? err.stack : err);
    // Send error message to user
    try {
      await sendTextMessage(
        instanceName,
        remoteJid,
        "Disculpa, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo?"
      );
    } catch (sendErr) {
      console.error("[wa-webhook] Failed to send error message:", sendErr instanceof Error ? sendErr.message : sendErr);
    }
  }
}

// ============================================================
// Connection Update Handler
// ============================================================

async function handleConnectionUpdate(payload: WebhookConnectionPayload) {
  const { instance: instanceName, data } = payload;
  const state = data.state;

  console.log(`[wa-webhook] Connection update: ${instanceName} → ${state}`);

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
      console.log(`[wa-webhook] ${instanceName} connection updated: ${state}`);
    }
  }
}
