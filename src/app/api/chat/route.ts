import { NextRequest } from "next/server";
import { getAIClient, AI_MODEL } from "@/lib/anthropic/client";
import { buildSystemPrompt } from "@/lib/anthropic/agent-system-prompt";
import { agentTools } from "@/lib/anthropic/tools";
import { handleToolCall } from "@/lib/anthropic/tool-handlers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLimit, incrementConversationCountDirect } from "@/lib/plans/feature-gate";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { UsageAccumulator } from "@/lib/anthropic/ai-usage-tracker";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 requests/min per IP
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.chat);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en un momento." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { messages, organizationSlug, conversationId, propertyContext } = body;

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
      .select("id, name, slug, agent_name, agent_personality, city, country")
      .eq("slug", organizationSlug)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organización no encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check conversation limit for new conversations (first message)
    const isNewConversation = !conversationId || messages.length <= 1;
    if (isNewConversation) {
      const limitCheck = await checkLimit(org.id, "conversations");
      if (!limitCheck.allowed) {
        return new Response(
          JSON.stringify({
            error: limitCheck.message,
            limitReached: true,
            limit: { current: limitCheck.current, max: limitCheck.max },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
      // Increment counter for new conversation
      await incrementConversationCountDirect(org.id);
    }

    let systemPrompt = buildSystemPrompt(org);

    // If user is viewing a specific property, inject context
    if (propertyContext && propertyContext.title && propertyContext.id) {
      systemPrompt += `\n\n## Contexto actual
El visitante está viendo la página de esta propiedad: "${propertyContext.title}" (${propertyContext.propertyType}, ${propertyContext.businessType}, ${propertyContext.price}, ${propertyContext.location}). ID: ${propertyContext.id}.
Si el visitante pregunta sobre "esta propiedad", "este inmueble", o hace preguntas sin especificar cuál, asume que se refiere a esta propiedad. Usa get_property_details con property_id "${propertyContext.id}" para obtener la información completa. No necesitas buscar — ya sabes de cuál propiedad habla.`;
    }

    const ai = getAIClient();

    // Convert messages to OpenAI format with system prompt
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];

    // Usage tracker for this conversation turn
    const usage = new UsageAccumulator(AI_MODEL, org.id, "web");

    // Create streaming response with tool-calling loop
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        let currentMessages = [...openaiMessages];
        let loopCount = 0;
        const maxLoops = 5; // prevent infinite tool loops

        try {
          while (loopCount < maxLoops) {
            loopCount++;

            // Stream the response
            const response = await ai.chat.completions.create({
              model: AI_MODEL,
              max_tokens: 1024,
              messages: currentMessages,
              tools: agentTools,
              stream: true,
              stream_options: { include_usage: true },
            });

            let currentText = "";
            let finishReason: string | null = null;
            // Accumulate tool calls from stream deltas
            const toolCallAccum: Record<number, { id: string; name: string; arguments: string }> = {};
            let streamUsage: { prompt_tokens?: number; completion_tokens?: number } = {};

            for await (const chunk of response) {
              const choice = chunk.choices[0];

              // Usage comes in the final chunk
              if (chunk.usage) {
                streamUsage = {
                  prompt_tokens: chunk.usage.prompt_tokens,
                  completion_tokens: chunk.usage.completion_tokens,
                };
              }

              if (!choice) continue;

              const delta = choice.delta;

              // Text content
              if (delta?.content) {
                currentText += delta.content;
                send("text", { text: delta.content });
              }

              // Tool calls (streamed incrementally)
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index;
                  if (!toolCallAccum[idx]) {
                    toolCallAccum[idx] = { id: "", name: "", arguments: "" };
                  }
                  if (tc.id) {
                    toolCallAccum[idx].id = tc.id;
                  }
                  if (tc.function?.name) {
                    toolCallAccum[idx].name = tc.function.name;
                    send("tool_use_start", { name: tc.function.name });
                  }
                  if (tc.function?.arguments) {
                    toolCallAccum[idx].arguments += tc.function.arguments;
                  }
                }
              }

              if (choice.finish_reason) {
                finishReason = choice.finish_reason;
              }
            }

            // Track usage for this API call
            usage.add(
              streamUsage.prompt_tokens || 0,
              streamUsage.completion_tokens || 0
            );

            // If tool calls were made, execute them
            const toolCalls = Object.values(toolCallAccum).filter((tc) => tc.id && tc.name);

            if (finishReason === "tool_calls" && toolCalls.length > 0) {
              // Build assistant message with tool_calls
              currentMessages.push({
                role: "assistant",
                content: currentText || null,
                tool_calls: toolCalls.map((tc) => ({
                  id: tc.id,
                  type: "function" as const,
                  function: {
                    name: tc.name,
                    arguments: tc.arguments,
                  },
                })),
              });

              // Execute each tool and add results
              for (const tc of toolCalls) {
                send("tool_result_start", { name: tc.name });
                usage.addTool(tc.name);

                let toolInput: Record<string, unknown>;
                try {
                  toolInput = JSON.parse(tc.arguments);
                } catch {
                  toolInput = {};
                }

                const result = await handleToolCall(
                  tc.name,
                  toolInput,
                  org.id,
                  conversationId,
                  org.slug
                );

                currentMessages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: result,
                });

                send("tool_result_end", { name: tc.name });
              }

              // Continue the loop to get the next response
              continue;
            }

            // No more tool calls — we're done
            break;
          }

          send("done", {});

          // Flush usage tracking (fire and forget)
          usage.flush().catch(console.error);

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
async function persistMessages(supabase: any, conversationId: string, messages: ChatCompletionMessageParam[]) {
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
