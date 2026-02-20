"use client";

import { InlineChat } from "./inline-chat";

interface InlineChatWrapperProps {
  organizationSlug: string;
  agentName: string;
  welcomeMessage?: string;
}

/**
 * Client-side wrapper for InlineChat, used to embed the chat
 * in server-rendered pages (tenant home, property detail, etc.)
 */
export function InlineChatWrapper({
  organizationSlug,
  agentName,
  welcomeMessage,
}: InlineChatWrapperProps) {
  return (
    <InlineChat
      organizationSlug={organizationSlug}
      agentName={agentName}
      welcomeMessage={welcomeMessage}
    />
  );
}
