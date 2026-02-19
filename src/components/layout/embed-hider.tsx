"use client";

import { useSearchParams } from "next/navigation";

/**
 * Hides tenant branding (navbar, footer, chat) when ?embed=1 is present.
 * Renders a <style> tag that hides elements by data attribute.
 */
export function EmbedHider() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";

  if (!isEmbed) return null;

  return (
    <style>{`
      [data-tenant-branding] { display: none !important; }
    `}</style>
  );
}
