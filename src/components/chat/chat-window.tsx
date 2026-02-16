"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import { ChatHeader } from "./chat-header";
import { ChatMessageBubble } from "./chat-message";
import { ChatInput } from "./chat-input";

interface ChatWindowProps {
  organizationSlug: string;
  agentName: string;
  welcomeMessage?: string;
}

export function ChatWindow({
  organizationSlug,
  agentName,
  welcomeMessage,
}: ChatWindowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isStreaming, toolActivity, sendMessage, clearMessages } =
    useChat({ organizationSlug });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolActivity]);

  const handleSend = (content: string) => {
    if (!hasInteracted) setHasInteracted(true);
    sendMessage(content);
  };

  return (
    <>
      {/* Chat widget */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[360px] sm:w-[400px] max-h-[550px] flex flex-col rounded-2xl overflow-hidden backdrop-blur-xl bg-bg-primary/95 border border-border-glass shadow-2xl shadow-black/30">
          <ChatHeader
            agentName={agentName}
            onMinimize={() => setIsOpen(false)}
            onClear={clearMessages}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm bg-white/[0.05] border border-border-glass text-text-primary">
                  {welcomeMessage ||
                    `Hola, soy ${agentName}. ¿En qué te puedo ayudar hoy? Puedo buscar propiedades, darte detalles y más.`}
                </div>
              </div>
            )}

            {messages.map((msg) => (
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

          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/25 hover:shadow-accent-blue/40 transition-all hover:scale-105 flex items-center justify-center"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </>
  );
}
