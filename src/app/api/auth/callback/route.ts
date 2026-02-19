import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";
  const next = searchParams.get("next") ?? "/admin";

  // Build the redirect URL based on type
  let redirectTo = `${origin}${next}`;
  if (type === "recovery") {
    redirectTo = `${origin}/reset-password`;
  } else if (type === "signup" || type === "email") {
    redirectTo = `${origin}/admin/onboarding`;
  }

  // Create a redirect response FIRST, then attach cookies to it
  const redirectResponse = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Try PKCE flow (code exchange) first
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectResponse;
    }
    console.error("[auth/callback] Code exchange failed:", error.message);
  }

  // Fallback: try token hash verification (magic link / OTP flow)
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "recovery" | "email_change",
    });
    if (!error) {
      return redirectResponse;
    }
    console.error("[auth/callback] Token hash verification failed:", error.message);
  }

  // If neither code nor token_hash, or both failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
