import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";
  const next = searchParams.get("next") ?? "/admin";
  const email = searchParams.get("email");
  const error_description = searchParams.get("error_description");

  console.log("[auth/callback] Incoming params:", {
    code: code ? `${code.substring(0, 8)}... (len=${code.length})` : null,
    token_hash: token_hash ? `${token_hash.substring(0, 10)}...` : null,
    type,
    email: email ? `${email.substring(0, 5)}...` : null,
    error_description,
  });

  // If Supabase sent an error, redirect to login
  if (error_description) {
    console.error("[auth/callback] Supabase error:", error_description);
    const failedUrl = new URL("/login", origin);
    failedUrl.searchParams.set("error", error_description);
    return NextResponse.redirect(failedUrl.toString());
  }

  // Build the redirect URL based on type
  let redirectTo = `${origin}${next}`;
  if (type === "recovery") {
    redirectTo = `${origin}/reset-password`;
  } else if (type === "signup" || type === "email") {
    redirectTo = `${origin}/admin/onboarding`;
  }

  const redirectResponse = NextResponse.redirect(redirectTo);

  // Cross-subdomain cookie domain
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
  const isProduction = !rootDomain.includes("localhost");
  const cookieDomain = isProduction ? `.${rootDomain}` : undefined;

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
            const cookieOptions = {
              ...options,
              ...(cookieDomain && { domain: cookieDomain }),
            };
            redirectResponse.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  let sessionEstablished = false;

  // Strategy 1: token_hash (Supabase may send this for email verification)
  if (token_hash) {
    const otpType = type === "signup" ? "email" : type;
    console.log("[auth/callback] Strategy 1: verifyOtp with token_hash, otpType:", otpType);
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType as "email" | "recovery" | "email_change",
    });
    if (!error) {
      console.log("[auth/callback] verifyOtp (token_hash) SUCCESS");
      sessionEstablished = true;
    } else {
      console.error("[auth/callback] verifyOtp (token_hash) failed:", error.message);
    }
  }

  // Strategy 2: OTP code + email (Supabase sends numeric OTP code in email link)
  if (!sessionEstablished && code && email) {
    const otpType = type === "signup" ? "email" : type === "recovery" ? "recovery" : "email";
    console.log("[auth/callback] Strategy 2: verifyOtp with email + code, otpType:", otpType);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: otpType as "email" | "recovery" | "email_change",
    });
    if (!error) {
      console.log("[auth/callback] verifyOtp (email+code) SUCCESS");
      sessionEstablished = true;
    } else {
      console.error("[auth/callback] verifyOtp (email+code) failed:", error.message);
    }
  }

  // Strategy 3: PKCE code exchange (longer alphanumeric codes)
  if (!sessionEstablished && code) {
    console.log("[auth/callback] Strategy 3: exchangeCodeForSession");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("[auth/callback] exchangeCodeForSession SUCCESS");
      sessionEstablished = true;
    } else {
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    }
  }

  if (sessionEstablished) {
    console.log("[auth/callback] Session established! Redirecting to:", redirectTo);
    return redirectResponse;
  }

  // Strategy 4 (last resort): Use admin client to confirm email manually
  // so user can at least log in normally (breaks the unconfirmed email loop)
  if (code && type === "signup") {
    console.log("[auth/callback] Strategy 4: admin email confirmation fallback");
    try {
      const adminClient = createAdminClient();

      if (email) {
        // We have the email — find user and confirm
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const targetUser = users?.find(u => u.email === email);
        if (targetUser && !targetUser.email_confirmed_at) {
          console.log("[auth/callback] Admin: confirming email for user:", targetUser.id);
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            targetUser.id,
            { email_confirm: true }
          );
          if (!updateError) {
            console.log("[auth/callback] Admin: email confirmed! Redirecting to login.");
            const successUrl = new URL("/login", origin);
            successUrl.searchParams.set("message", "email_confirmed");
            return NextResponse.redirect(successUrl.toString());
          } else {
            console.error("[auth/callback] Admin: updateUser failed:", updateError.message);
          }
        } else {
          console.log("[auth/callback] Admin: user not found or already confirmed");
        }
      } else {
        console.error("[auth/callback] Admin fallback: no email param, cannot identify user");
      }
    } catch (e) {
      console.error("[auth/callback] Admin fallback error:", e);
    }
  }

  // All strategies failed
  console.error("[auth/callback] ALL STRATEGIES FAILED");
  const failedUrl = new URL("/login", origin);
  failedUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(failedUrl.toString());
}
