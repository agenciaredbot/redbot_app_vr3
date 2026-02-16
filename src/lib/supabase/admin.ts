import { createClient } from "@supabase/supabase-js";

// Admin client uses service role key and bypasses RLS.
// We don't pass Database generic here since the auto-generated types
// will be regenerated from `npx supabase gen types` once the local instance runs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): ReturnType<typeof createClient<any>> {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
