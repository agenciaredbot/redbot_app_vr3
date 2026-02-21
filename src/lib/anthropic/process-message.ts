/**
 * Shared message processing function for Claude AI agent.
 *
 * Used by both:
 * - Web chat (SSE streaming — calls this for tool resolution)
 * - WhatsApp webhook (synchronous — full response at once)
 *
 * Handles the tool-calling loop: sends messages to Claude,
 * executes tool calls, and returns the final response.
 */

import { getAnthropicClient } from "./client";
import { buildSystemPrompt } from "./agent-system-prompt";
import { agentTools } from "./tools";
import { handleToolCall } from "./tool-handlers";
import type Anthropic from "@anthropic-ai/sdk";

export interface ProcessMessageParams {
  /** Conversation messages in Anthropic format */
  messages: Anthropic.MessageParam[];
  /** Organization ID for scoping data access */
  organizationId: string;
  /** Organization slug for building URLs */
  orgSlug: string;
  /** Org context for building the system prompt */
  orgContext: {
    name: string;
    slug: string;
    agent_name: string;
    agent_personality: string | null;
    city: string | null;
    country: string;
  };
  /** Channel: "web" or "whatsapp" — affects system prompt and response style */
  channel: "web" | "whatsapp";
  /** Optional conversation ID for tool context */
  conversationId?: string;
  /** Channel-specific context (e.g., WhatsApp phone number) */
  channelContext?: {
    phone?: string;
  };
}

export interface ProcessMessageResult {
  /** Final text response from the AI */
  responseText: string;
  /** All messages including tool calls/results (for persistence) */
  allMessages: Anthropic.MessageParam[];
  /** Names of tools that were used */
  toolsUsed: string[];
}

/**
 * Process a message through Claude with tool-calling loop.
 * Non-streaming — returns the complete response.
 *
 * Max 5 tool-call iterations to prevent infinite loops.
 */
export async function processMessage(
  params: ProcessMessageParams
): Promise<ProcessMessageResult> {
  const {
    messages,
    organizationId,
    orgSlug,
    orgContext,
    channel,
    conversationId,
    channelContext,
  } = params;

  const anthropic = getAnthropicClient();

  // Build system prompt with channel-specific instructions
  let systemPrompt = buildSystemPrompt(orgContext);

  if (channel === "whatsapp") {
    systemPrompt += `\n\n## Canal: WhatsApp
Estás respondiendo por WhatsApp. Reglas adicionales:
- Respuestas CORTAS y directas — máximo 1-2 párrafos.
- NO uses markdown (ni **, ni ##, ni listas con -). WhatsApp no lo renderiza.
- Puedes usar emojis para ser más amigable.
- Los links van como texto plano (sin formato markdown).
- Si el usuario envía su nombre, no pidas email si ya tienes su número de teléfono — el teléfono es suficiente para registrar el lead.
- El número de teléfono del usuario es: ${channelContext?.phone || "desconocido"}. Úsalo automáticamente al registrar leads.`;
  }

  let currentMessages = [...messages];
  let loopCount = 0;
  const maxLoops = 5;
  const toolsUsed: string[] = [];
  let finalText = "";

  while (loopCount < maxLoops) {
    loopCount++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: channel === "whatsapp" ? 512 : 1024,
      system: systemPrompt,
      messages: currentMessages,
      tools: agentTools,
    });

    // Extract text and tool_use blocks
    const textBlocks = response.content.filter((b) => b.type === "text");
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");

    // Accumulate text
    finalText = textBlocks.map((b) => ("text" in b ? b.text : "")).join("");

    if (response.stop_reason === "tool_use" && toolBlocks.length > 0) {
      // Add assistant message with full content (text + tool_use)
      currentMessages.push({
        role: "assistant",
        content: response.content,
      });

      // Execute each tool
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        if (block.type === "tool_use") {
          toolsUsed.push(block.name);

          const result = await handleToolCall(
            block.name,
            block.input as Record<string, unknown>,
            organizationId,
            conversationId,
            orgSlug,
            channelContext ? { channel, phone: channelContext.phone } : undefined
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add tool results as user message
      currentMessages.push({
        role: "user",
        content: toolResults,
      });

      // Continue loop — Claude will process tool results
      continue;
    }

    // No more tool calls — we're done
    break;
  }

  return {
    responseText: finalText,
    allMessages: currentMessages,
    toolsUsed,
  };
}
