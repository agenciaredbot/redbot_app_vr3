import { NextRequest } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { buildSystemPrompt } from "@/lib/anthropic/agent-system-prompt";
import { agentTools } from "@/lib/anthropic/tools";
import { handleToolCall } from "@/lib/anthropic/tool-handlers";
import { createAdminClient } from "@/lib/supabase/admin";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, organizationSlug, conversationId } = body;

    if (!messages || !organizationSlug) {
      return new Response(
        JSON.stringify({ error: "messages y organizationSlug son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createAdminClient();

    // Get org
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, agent_name, agent_personality, city, country")
      .eq("slug", organizationSlug)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organización no encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(org);
    const anthropic = getAnthropicClient();

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })
    );

    // Create streaming response with tool-calling loop
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        let currentMessages = [...anthropicMessages];
        let loopCount = 0;
        const maxLoops = 5; // prevent infinite tool loops

        try {
          while (loopCount < maxLoops) {
            loopCount++;

            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 1024,
              system: systemPrompt,
              messages: currentMessages,
              tools: agentTools,
              stream: true,
            });

            let currentText = "";
            let toolUseBlocks: Anthropic.ContentBlock[] = [];
            let stopReason: string | null = null;

            for await (const event of response) {
              if (event.type === "content_block_delta") {
                const delta = event.delta;
                if ("text" in delta && delta.text) {
                  currentText += delta.text;
                  send("text", { text: delta.text });
                }
              } else if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  send("tool_use_start", {
                    name: event.content_block.name,
                  });
                }
              } else if (event.type === "message_delta") {
                stopReason = event.delta.stop_reason;
              } else if (event.type === "message_stop") {
                // Collect tool_use blocks from the message
                // We need to reconstruct them from the stream events
              }
            }

            // If stop_reason is "tool_use", we need to handle tool calls
            if (stopReason === "tool_use") {
              // Re-create the message non-streaming to get proper tool blocks
              const fullResponse = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 1024,
                system: systemPrompt,
                messages: currentMessages,
                tools: agentTools,
              });

              toolUseBlocks = fullResponse.content.filter(
                (block) => block.type === "tool_use"
              );

              // Build assistant message with full content
              currentMessages.push({
                role: "assistant",
                content: fullResponse.content,
              });

              // Execute tools and add results
              const toolResults: Anthropic.ToolResultBlockParam[] = [];
              for (const block of toolUseBlocks) {
                if (block.type === "tool_use") {
                  send("tool_result_start", { name: block.name });
                  const result = await handleToolCall(
                    block.name,
                    block.input as Record<string, unknown>,
                    org.id,
                    conversationId
                  );
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: result,
                  });
                  send("tool_result_end", { name: block.name });
                }
              }

              currentMessages.push({
                role: "user",
                content: toolResults,
              });

              // Continue the loop to get the next response
              continue;
            }

            // No more tool calls — we're done
            break;
          }

          send("done", {});

          // Persist conversation to DB (fire and forget)
          if (conversationId) {
            persistMessages(supabase, conversationId, currentMessages).catch(
              console.error
            );
          }
        } catch (err) {
          console.error("Chat stream error:", err);
          send("error", {
            error: "Error procesando la respuesta. Intenta de nuevo.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function persistMessages(supabase: any, conversationId: string, messages: Anthropic.MessageParam[]) {
  // Only persist the last user message and assistant response
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user" && typeof m.content === "string");
  const lastAssistantMsg = [...messages].reverse().find(
    (m) => m.role === "assistant" && typeof m.content === "string"
  );

  const toInsert = [];

  if (lastUserMsg && typeof lastUserMsg.content === "string") {
    toInsert.push({
      conversation_id: conversationId,
      role: "user",
      content: lastUserMsg.content,
    });
  }

  if (lastAssistantMsg && typeof lastAssistantMsg.content === "string") {
    toInsert.push({
      conversation_id: conversationId,
      role: "assistant",
      content: lastAssistantMsg.content,
    });
  }

  if (toInsert.length > 0) {
    await supabase.from("messages").insert(toInsert);
  }
}
