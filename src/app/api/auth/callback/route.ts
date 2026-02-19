import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";
  const next = searchParams.get("next") ?? "/admin";

  console.log("[auth/callback] Params:", { code: code?.substring(0, 8), token_hash: !!token_hash, type, next });

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
          console.log("[auth/callback] Setting cookies:", cookiesToSet.map(c => c.name));
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Try token_hash first (from Supabase email links)
  if (token_hash) {
    const otpType = type === "signup" ? "email" : type;
    console.log("[auth/callback] Trying verifyOtp with token_hash, type:", otpType);
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType as "email" | "recovery" | "email_change",
    });
    if (!error) {
      console.log("[auth/callback] token_hash verification SUCCESS");
      return redirectResponse;
    }
    console.error("[auth/callback] token_hash verification failed:", error.message);
  }

  // Try code exchange (works for both PKCE and Supabase's email confirmation flow)
  if (code) {
    console.log("[auth/callback] Trying exchangeCodeForSession, code length:", code.length);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("[auth/callback] Code exchange SUCCESS");
      return redirectResponse;
    }
    console.error("[auth/callback] Code exchange failed:", error.message, error.status);
  }

  // Nothing worked
  console.error("[auth/callback] All strategies failed. code:", !!code, "token_hash:", !!token_hash);
  const failedUrl = new URL("/login", origin);
  failedUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(failedUrl.toString());
}
