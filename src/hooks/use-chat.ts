"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface UseChatOptions {
  organizationSlug: string;
}

/** Storage key scoped per organization */
function storageKey(slug: string) {
  return `redbot-chat-${slug}`;
}

function loadMessages(slug: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    // Strip any leftover streaming flags
    return parsed.map((m) => ({ ...m, isStreaming: false }));
  } catch {
    return [];
  }
}

function saveMessages(slug: string, messages: ChatMessage[]) {
  try {
    // Only persist completed messages (non-streaming, with content)
    const toSave = messages
      .filter((m) => m.content && !m.isStreaming)
      .map(({ id, role, content }) => ({ id, role, content }));
    sessionStorage.setItem(storageKey(slug), JSON.stringify(toSave));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

export function useChat({ organizationSlug }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessages(organizationSlug)
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    if (!isStreaming) {
      saveMessages(organizationSlug, messages);
    }
  }, [messages, isStreaming, organizationSlug]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
      };

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setToolActivity(null);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        // Build message history for API
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            organizationSlug,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Error de red");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (currentEvent) {
                  case "text":
                    setMessages((prev) => {
                      const updated = [...prev];
                      const last = updated[updated.length - 1];
                      if (last.role === "assistant") {
                        last.content += data.text;
                      }
                      return updated;
                    });
                    break;
                  case "tool_use_start":
                    setToolActivity(getToolLabel(data.name));
                    break;
                  case "tool_result_end":
                    setToolActivity(null);
                    break;
                  case "done":
                    setMessages((prev) => {
                      const updated = [...prev];
                      const last = updated[updated.length - 1];
                      if (last.role === "assistant") {
                        last.isStreaming = false;
                      }
                      return updated;
                    });
                    break;
                  case "error":
                    setMessages((prev) => {
                      const updated = [...prev];
                      const last = updated[updated.length - 1];
                      if (last.role === "assistant") {
                        last.content =
                          data.error || "Error al procesar la respuesta.";
                        last.isStreaming = false;
                      }
                      return updated;
                    });
                    break;
                }
              } catch {
                // skip malformed JSON
              }
              currentEvent = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              last.content = "Error de conexión. Intenta de nuevo.";
              last.isStreaming = false;
            }
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        setToolActivity(null);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, organizationSlug]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      sessionStorage.removeItem(storageKey(organizationSlug));
    } catch {
      // ignore
    }
  }, [organizationSlug]);

  return {
    messages,
    isStreaming,
    toolActivity,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}

function getToolLabel(name: string): string {
  switch (name) {
    case "search_properties":
      return "Buscando propiedades...";
    case "get_property_details":
      return "Consultando detalles...";
    case "register_lead":
      return "Registrando contacto...";
    default:
      return "Procesando...";
  }
}
