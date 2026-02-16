import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

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
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
