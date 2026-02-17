import { useMemo } from "react";
import type { ChatMessage } from "@/hooks/use-chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

/**
 * Parse message text into rich elements:
 * - URLs → clickable <a> links
 * - **bold** → <strong>
 * - Markdown links [text](url) → clickable <a>
 */
function parseMessageContent(text: string, isUser: boolean): React.ReactNode[] {
  // Combined regex:
  // 1. Markdown links: [text](url)
  // 2. Standalone URLs: https://... or http://...
  // 3. Bold: **text**
  const TOKEN_RE =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>)"]+)|\*\*(.+?)\*\*/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    // Push text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Markdown link: [text](url)
      nodes.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isUser
              ? "underline underline-offset-2 hover:opacity-80"
              : "text-accent-cyan underline underline-offset-2 hover:text-accent-cyan/80 transition-colors"
          }
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      // Standalone URL
      const url = match[3].replace(/[.,;:!?)]+$/, ""); // trim trailing punctuation
      const trailing = match[3].slice(url.length);
      nodes.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isUser
              ? "underline underline-offset-2 hover:opacity-80"
              : "text-accent-cyan underline underline-offset-2 hover:text-accent-cyan/80 transition-colors"
          }
        >
          {url}
        </a>
      );
      if (trailing) nodes.push(trailing);
    } else if (match[4]) {
      // Bold: **text**
      nodes.push(
        <strong key={key++} className="font-semibold">
          {match[4]}
        </strong>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  const renderedContent = useMemo(
    () => parseMessageContent(message.content, isUser),
    [message.content, isUser]
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
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
        <div className="whitespace-pre-wrap break-words">
          {renderedContent}
        </div>
        {message.isStreaming && !message.content && (
          <div className="flex gap-1 py-1">
            <span
              className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
