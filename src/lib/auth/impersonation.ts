import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const IMPERSONATION_COOKIE_NAME = "impersonating_org_id";

const isProduction = process.env.NODE_ENV === "production";
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";

export function getImpersonationCookieOptions(
  maxAge?: number
): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    // In production, set domain so cookie is readable across subdomains
    ...(isProduction ? { domain: `.${rootDomain}` } : {}),
    maxAge: maxAge ?? 8 * 60 * 60, // 8 hours default
  };
}
