import type { ChatMessage } from "@/hooks/use-chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`
          max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${
            isUser
              ? "bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-br-md"
              : "bg-white/[0.05] border border-border-glass text-text-primary rounded-bl-md"
          }
        `}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.isStreaming && !message.content && (
          <div className="flex gap-1 py-1">
            <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </div>
  );
}
