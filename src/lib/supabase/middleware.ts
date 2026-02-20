import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Cross-subdomain cookie domain (e.g. ".redbot.app" allows *.redbot.app)
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
const isProduction = !rootDomain.includes("localhost");
const cookieDomain = isProduction ? `.${rootDomain}` : undefined;

export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  // Using `any` generic until proper types are generated via `npx supabase gen types`
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              // Set domain for cross-subdomain cookie sharing in production
              ...(cookieDomain && { domain: cookieDomain }),
            };
            request.cookies.set(name, value);
            response.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );
}
