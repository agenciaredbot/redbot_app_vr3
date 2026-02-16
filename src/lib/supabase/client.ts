import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Using `any` generic until proper types are generated via `npx supabase gen types`
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
