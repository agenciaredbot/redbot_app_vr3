/**
 * WhatsApp Conversation Manager
 *
 * Handles conversation persistence for WhatsApp channel:
 * - Find or create conversations by WhatsApp JID
 * - Load conversation history
 * - Persist incoming and outgoing messages
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type Anthropic from "@anthropic-ai/sdk";

interface ConversationRecord {
  id: string;
  organization_id: string;
  whatsapp_jid: string;
  channel: string;
  status: string;
  message_count: number;
}

interface MessageRecord {
  role: string;
  content: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: Record<string, unknown>;
}

/**
 * Find an existing WhatsApp conversation or create a new one.
 *
 * Conversations are scoped by (organization_id, whatsapp_jid).
 * Only one active conversation per JID per org.
 */
export async function findOrCreateConversation(
  organizationId: string,
  whatsappJid: string,
  contactName?: string
): Promise<ConversationRecord> {
  const supabase = createAdminClient();

  // Look for existing active conversation
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id, organization_id, whatsapp_jid, channel, status, message_count")
    .eq("organization_id", organizationId)
    .eq("whatsapp_jid", whatsappJid)
    .eq("status", "active")
    .single();

  if (existing) {
    console.log(`[wa-convo] Found existing conversation: ${existing.id} (msgs: ${existing.message_count})`);
    // Update last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", existing.id);

    return existing as ConversationRecord;
  }

  if (findError && findError.code !== "PGRST116") {
    // PGRST116 = "no rows" — expected for new conversations
    console.warn(`[wa-convo] Unexpected find error:`, findError.message);
  }

  // Create new conversation
  console.log(`[wa-convo] Creating new conversation for jid=${whatsappJid}, org=${organizationId}`);
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({
      organization_id: organizationId,
      whatsapp_jid: whatsappJid,
      channel: "whatsapp",
      source: "whatsapp",
      status: "active",
      started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      // Store contact name in session_id field temporarily (it's nullable text)
      session_id: contactName ? `wa:${contactName}` : null,
    })
    .select("id, organization_id, whatsapp_jid, channel, status, message_count")
    .single();

  if (error || !newConv) {
    console.error(`[wa-convo] Failed to create conversation:`, error?.message, error?.details, error?.hint);
    throw new Error(`Failed to create WhatsApp conversation: ${error?.message}`);
  }

  console.log(`[wa-convo] Created conversation: ${newConv.id}`);
  return newConv as ConversationRecord;
}

/**
 * Load conversation history as Anthropic message format.
 *
 * Returns the last N messages from the conversation,
 * formatted as alternating user/assistant messages.
 * Ensures proper alternation required by Claude API.
 */
export async function loadConversationHistory(
  conversationId: string,
  limit: number = 20
): Promise<Anthropic.MessageParam[]> {
  const supabase = createAdminClient();

  const { data: messages, error } = await supabase
    .from("messages")
    .select("role, content, tool_name, tool_input, tool_result")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"]) // Only get user/assistant messages
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(`[wa-convo] Error loading history for ${conversationId}:`, error.message);
    return [];
  }

  if (!messages || messages.length === 0) {
    console.log(`[wa-convo] No history for conversation ${conversationId}`);
    return [];
  }

  // Convert DB messages to Anthropic format
  // Only include user and assistant messages with non-empty string content
  const anthropicMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if ((msg.role === "user" || msg.role === "assistant") && msg.content && msg.content.trim()) {
      anthropicMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  // Ensure messages alternate correctly (user, assistant, user, assistant...)
  // When consecutive same-role messages exist, merge them or keep the last one
  const cleaned: Anthropic.MessageParam[] = [];
  for (const msg of anthropicMessages) {
    if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== msg.role) {
      cleaned.push(msg);
    } else {
      // Same role consecutive — replace with the latest one
      cleaned[cleaned.length - 1] = msg;
    }
  }

  // Ensure history starts with "user" (Claude requirement)
  while (cleaned.length > 0 && cleaned[0].role !== "user") {
    cleaned.shift();
  }

  // Ensure history ends with "assistant" (so the new user message comes next)
  while (cleaned.length > 0 && cleaned[cleaned.length - 1].role !== "assistant") {
    cleaned.pop();
  }

  console.log(`[wa-convo] History: ${messages.length} raw → ${cleaned.length} cleaned for ${conversationId}`);

  return cleaned;
}

/**
 * Persist user message and assistant response to the database.
 */
export async function persistMessages(
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
  toolsUsed?: string[]
): Promise<void> {
  const supabase = createAdminClient();

  const toInsert: MessageRecord[] = [
    {
      role: "user",
      content: userMessage,
    },
    {
      role: "assistant",
      content: assistantMessage,
    },
  ];

  // If tools were used, add a summary message
  if (toolsUsed && toolsUsed.length > 0) {
    // Insert tool usage as a system note (for analytics/debugging)
    toInsert.push({
      role: "system",
      content: `[Tools used: ${toolsUsed.join(", ")}]`,
    });
  }

  const insertData = toInsert.map((msg) => ({
    conversation_id: conversationId,
    role: msg.role,
    content: msg.content,
    tool_name: msg.tool_name || null,
    tool_input: msg.tool_input || null,
    tool_result: msg.tool_result || null,
  }));

  const { error } = await supabase.from("messages").insert(insertData);

  if (error) {
    console.error("[wa-convo] Error persisting messages:", error.message);
  }

  // Update message count and last_message_at
  const { data: conv } = await supabase
    .from("conversations")
    .select("message_count")
    .eq("id", conversationId)
    .single();

  await supabase
    .from("conversations")
    .update({
      message_count: (conv?.message_count || 0) + 2, // +2 for user + assistant
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}
