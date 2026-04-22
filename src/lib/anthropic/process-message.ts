/**
 * Shared message processing function for AI agent.
 *
 * Used by both:
 * - Web chat (SSE streaming — calls this for tool resolution)
 * - WhatsApp webhook (synchronous — full response at once)
 *
 * Handles the tool-calling loop: sends messages to the AI,
 * executes tool calls, and returns the final response.
 */

import { getAIClient, AI_MODEL } from "./client";
import { buildSystemPrompt } from "./agent-system-prompt";
import { agentTools } from "./tools";
import { handleToolCall } from "./tool-handlers";
import { UsageAccumulator } from "./ai-usage-tracker";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface ProcessMessageParams {
  /** Conversation messages in OpenAI format */
  messages: ChatCompletionMessageParam[];
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
  allMessages: ChatCompletionMessageParam[];
  /** Names of tools that were used */
  toolsUsed: string[];
}

/**
 * Process a message through the AI with tool-calling loop.
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

  const ai = getAIClient();

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

  // Build messages with system prompt
  let currentMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];
  let loopCount = 0;
  const maxLoops = 5;
  const toolsUsed: string[] = [];
  let finalText = "";

  // Usage tracker
  const usage = new UsageAccumulator(AI_MODEL, organizationId, channel);

  while (loopCount < maxLoops) {
    loopCount++;

    console.log(`[processMessage] Loop ${loopCount}/${maxLoops}: sending ${currentMessages.length} messages (channel=${channel})`);

    const response = await ai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: channel === "whatsapp" ? 1024 : 2048,
      temperature: 0.2,
      messages: currentMessages,
      tools: agentTools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const responseMessage = choice.message;

    // Track usage
    usage.add(
      response.usage?.prompt_tokens || 0,
      response.usage?.completion_tokens || 0
    );

    console.log(`[processMessage] Loop ${loopCount}: finish_reason=${choice.finish_reason}, usage=${JSON.stringify(response.usage)}`);

    // Extract text
    finalText = responseMessage.content || "";

    // Check for tool calls
    if (choice.finish_reason === "tool_calls" && responseMessage.tool_calls?.length) {
      const fnToolCalls = responseMessage.tool_calls.filter(
        (tc): tc is Extract<typeof tc, { type: "function" }> => tc.type === "function"
      );
      console.log(`[processMessage] Loop ${loopCount}: executing ${fnToolCalls.length} tool(s): ${fnToolCalls.map(tc => tc.function.name).join(", ")}`);

      // Add assistant message with tool_calls
      currentMessages.push({
        role: "assistant",
        content: responseMessage.content || null,
        tool_calls: responseMessage.tool_calls,
      });

      // Execute each tool
      for (const toolCall of fnToolCalls) {
        const toolName = toolCall.function.name;
        toolsUsed.push(toolName);
        usage.addTool(toolName);

        let toolInput: Record<string, unknown>;
        try {
          toolInput = JSON.parse(toolCall.function.arguments);
        } catch {
          toolInput = {};
        }

        try {
          const result = await handleToolCall(
            toolName,
            toolInput,
            organizationId,
            conversationId,
            orgSlug,
            channelContext ? { channel, phone: channelContext.phone } : undefined
          );

          console.log(`[processMessage] Tool ${toolName}: result (${result.length} chars)`);

          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        } catch (toolErr) {
          console.error(`[processMessage] Tool ${toolName} ERROR:`, toolErr instanceof Error ? toolErr.message : toolErr);
          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Tool execution failed: ${toolErr instanceof Error ? toolErr.message : "unknown error"}` }),
          });
        }
      }

      // Continue loop — AI will process tool results
      continue;
    }

    // No more tool calls — we're done
    console.log(`[processMessage] Done after ${loopCount} loop(s). Response: ${finalText.length} chars`);
    break;
  }

  // Flush usage tracking (fire and forget)
  usage.flush().catch(console.error);

  return {
    responseText: finalText,
    allMessages: currentMessages,
    toolsUsed,
  };
}
