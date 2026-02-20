import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cross-subdomain cookie domain (e.g. ".redbot.app" allows *.redbot.app)
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
const isProduction = !rootDomain.includes("localhost");
const cookieDomain = isProduction ? `.${rootDomain}` : undefined;

export async function createClient() {
  const cookieStore = await cookies();

  // Using `any` generic until proper types are generated via `npx supabase gen types`
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                ...(cookieDomain && { domain: cookieDomain }),
              };
              cookieStore.set(name, value, cookieOptions);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
