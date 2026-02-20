"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useChat } from "@/hooks/use-chat";
import { ChatMessageBubble } from "./chat-message";

interface InlineChatProps {
  organizationSlug: string;
  agentName: string;
  welcomeMessage?: string;
}

export function InlineChat({
  organizationSlug,
  agentName,
  welcomeMessage,
}: InlineChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { messages, isStreaming, toolActivity, sendMessage, clearMessages } =
    useChat({ organizationSlug });

  // Auto-expand when there are messages
  useEffect(() => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  }, [messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, toolActivity, isExpanded]);

  const handleSend = () => {
    if (!inputValue.trim() || isStreaming) return;
    sendMessage(inputValue.trim());
    setInputValue("");
    setIsExpanded(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show last 3 messages in mini preview
  const visibleMessages = messages.slice(-3);

  return (
    <div ref={containerRef} className="w-full">
      <div className="backdrop-blur-xl bg-bg-glass/60 border border-border-glass rounded-2xl overflow-hidden transition-all duration-300">
        {/* Expanded conversation area */}
        {isExpanded && messages.length > 0 && (
          <div className="border-b border-border-glass">
            {/* Mini header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-glass/50">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Image
                    src="/redbot-favicon-96x96.png"
                    alt="Redbot"
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-bg-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    {agentName}
                  </p>
                  <p className="text-[10px] text-accent-green">En linea</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearMessages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-glass-hover text-text-muted hover:text-text-secondary transition-colors"
                  title="Limpiar chat"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-glass-hover text-text-muted hover:text-text-secondary transition-colors"
                  title="Minimizar"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="overflow-y-auto max-h-[300px] p-4 space-y-3">
              {visibleMessages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} />
              ))}

              {/* Tool activity indicator */}
              {toolActivity && (
                <div className="flex justify-start">
                  <div className="px-3 py-1.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                    {toolActivity}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input area — always visible */}
        <div className="p-3">
          {/* Placeholder label when no messages */}
          {!isExpanded && messages.length === 0 && (
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-bg-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {welcomeMessage ||
                    `Preguntale a ${agentName} lo que necesites`}
                </p>
                <p className="text-xs text-text-muted">
                  Busca propiedades, pide detalles, agenda visitas y mas
                </p>
              </div>
            </div>
          )}

          {/* Collapsed preview — show when there are messages but panel is collapsed */}
          {!isExpanded && messages.length > 0 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full flex items-center gap-2.5 mb-3 px-1 text-left group"
            >
              <div className="relative flex-shrink-0">
                <Image
                  src="/redbot-favicon-96x96.png"
                  alt="Redbot"
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-bg-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted truncate">
                  {messages[messages.length - 1]?.content || "Conversacion activa"}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
          )}

          {/* Text input */}
          <div className="relative flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (messages.length > 0) setIsExpanded(true);
              }}
              placeholder="Escribe tu pregunta sobre propiedades..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl bg-bg-primary/60 border border-border-glass text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/40 disabled:opacity-50 resize-none transition-all"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "44px";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white disabled:opacity-30 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-95 flex-shrink-0"
            >
              {isStreaming ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
