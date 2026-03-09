import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/utils/slug";
import { PLANS, isTrialEligible } from "@/config/plans";
import type { PlanTier } from "@/lib/supabase/types";

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

  // Cross-subdomain cookie domain
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
  const isProduction = !rootDomain.includes("localhost");
  const cookieDomain = isProduction ? `.${rootDomain}` : undefined;

  // We'll set the final redirect AFTER potentially creating the org
  // Default redirect based on type
  let redirectTo = `${origin}${next}`;
  if (type === "recovery") {
    redirectTo = `${origin}/reset-password`;
  } else if (type === "signup" || type === "email") {
    redirectTo = `${origin}/admin/onboarding`;
  }

  // We need a mutable ref for the redirect response because cookie setAll
  // captures the response object at creation time
  let finalRedirectUrl = redirectTo;
  const redirectResponseRef = { current: NextResponse.redirect(redirectTo) };

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
            redirectResponseRef.current.cookies.set(name, value, cookieOptions);
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

  if (!sessionEstablished) {
    console.error("[auth/callback] ALL STRATEGIES FAILED");
    const failedUrl = new URL("/login", origin);
    failedUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(failedUrl.toString());
  }

  // ─── Session established — now provision org + profile for new signups ───

  if (type === "signup" || type === "email") {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error("[auth/callback] Session OK but no user found");
        return redirectResponseRef.current;
      }

      const meta = user.user_metadata || {};
      const fullName = meta.full_name || user.email?.split("@")[0] || "Usuario";
      const organizationName = meta.organization_name;
      const planTier = (meta.plan_tier || "basic") as PlanTier;
      const intent = meta.intent || "trial";
      const refCode = meta.ref_code || "";

      // Skip org creation if user already has a profile (idempotent)
      const adminClient = createAdminClient();
      const { data: existingProfile } = await adminClient
        .from("user_profiles")
        .select("id, organization_id")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        console.log("[auth/callback] User already has profile, skipping org creation:", user.id);

        // Still need to redirect based on intent for returning users
        if (intent === "buy" && existingProfile.organization_id) {
          finalRedirectUrl = `${origin}/checkout?plan=${planTier}&org=${existingProfile.organization_id}`;
        }
        // Update redirect response with new URL
        redirectResponseRef.current = NextResponse.redirect(finalRedirectUrl);
        // Re-set cookies on the new response
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Cookies were already set on the old response; we need to copy them
          // The session cookies are set by Supabase SSR internally
        }
        console.log("[auth/callback] Redirecting existing user to:", finalRedirectUrl);
        return redirectResponseRef.current;
      }

      // Create organization only if we have a name from metadata
      if (!organizationName) {
        console.error("[auth/callback] No organization_name in metadata for:", user.id);
        // Redirect to onboarding anyway — they can set it up there
        return redirectResponseRef.current;
      }

      // Validate trial eligibility
      if (intent === "trial" && !isTrialEligible(planTier)) {
        console.warn("[auth/callback] Invalid trial for tier:", planTier, "— defaulting to buy");
      }

      // Generate slug from org name
      let slug = generateSlug(organizationName);
      const { data: existingOrg } = await adminClient
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existingOrg) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      }

      // Create organization with plan based on intent
      const selectedPlan = PLANS[planTier] || PLANS["basic"];
      const isBuy = intent === "buy";

      const trialEndsAt = isBuy
        ? null
        : new Date(Date.now() + selectedPlan.trialDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: org, error: orgError } = await adminClient
        .from("organizations")
        .insert({
          name: organizationName,
          slug,
          email: user.email,
          plan_tier: planTier,
          plan_status: isBuy ? "unpaid" : "trialing",
          trial_ends_at: trialEndsAt,
          max_properties: selectedPlan.limits.maxProperties,
          max_agents: selectedPlan.limits.maxAgents,
          max_conversations_per_month: selectedPlan.limits.maxConversationsPerMonth,
        })
        .select()
        .single();

      if (orgError || !org) {
        console.error("[auth/callback] Failed to create org:", orgError?.message);
        const failedUrl = new URL("/login", origin);
        failedUrl.searchParams.set("error", "org_creation_failed");
        return NextResponse.redirect(failedUrl.toString());
      }

      console.log("[auth/callback] Organization created:", org.id, org.slug);

      // Create user profile
      const { error: profileError } = await adminClient
        .from("user_profiles")
        .insert({
          id: user.id,
          organization_id: org.id,
          role: "org_admin",
          full_name: fullName,
          email: user.email,
        });

      if (profileError) {
        console.error("[auth/callback] Failed to create profile:", profileError.message);
        // Clean up the org we just created
        await adminClient.from("organizations").delete().eq("id", org.id);
        const failedUrl = new URL("/login", origin);
        failedUrl.searchParams.set("error", "profile_creation_failed");
        return NextResponse.redirect(failedUrl.toString());
      }

      console.log("[auth/callback] Profile created for user:", user.id);

      // Track affiliate referral (non-blocking)
      if (refCode) {
        try {
          const { data: affiliate } = await adminClient
            .from("affiliates")
            .select("id")
            .eq("referral_code", refCode)
            .eq("status", "active")
            .single();

          if (affiliate) {
            await adminClient
              .from("organizations")
              .update({ referred_by_affiliate_id: affiliate.id })
              .eq("id", org.id);

            await adminClient.from("affiliate_referrals").insert({
              affiliate_id: affiliate.id,
              referred_org_id: org.id,
              referral_code_used: refCode,
              status: "pending",
            });

            await adminClient.rpc("increment_affiliate_referrals", {
              aff_id: affiliate.id,
            });

            console.log(`[auth/callback] Referral tracked: code=${refCode}, org=${org.id}`);
          }
        } catch (err) {
          console.error("[auth/callback] Affiliate referral tracking error:", err);
        }
      }

      // Set redirect based on intent
      if (isBuy) {
        finalRedirectUrl = `${origin}/checkout?plan=${planTier}&org=${org.id}`;
      } else {
        finalRedirectUrl = `${origin}/admin/onboarding`;
      }

      console.log("[auth/callback] New user provisioned. Redirecting to:", finalRedirectUrl);
    } catch (err) {
      console.error("[auth/callback] Error provisioning org/profile:", err);
      // Still redirect to onboarding — better than failing completely
    }
  }

  // Build final redirect response with cookies
  const finalResponse = NextResponse.redirect(finalRedirectUrl);

  // Copy cookies from the original response (set by Supabase SSR during session establishment)
  redirectResponseRef.current.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, {
      ...(cookieDomain && { domain: cookieDomain }),
    });
  });

  console.log("[auth/callback] Session established! Redirecting to:", finalRedirectUrl);
  return finalResponse;
}
