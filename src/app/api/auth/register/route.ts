import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema } from "@/lib/validators/auth";
import { generateSlug } from "@/lib/utils/slug";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { PLANS, isTrialEligible } from "@/config/plans";
import type { PlanTier } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per hour per IP
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.authRegister);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos de registro. Intenta de nuevo más tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email, password, organizationName, planTier, intent } = parsed.data;

    // Validate trial eligibility
    if (intent === "trial" && !isTrialEligible(planTier as PlanTier)) {
      return NextResponse.json(
        { error: "La prueba gratuita solo está disponible para el plan Starter" },
        { status: 400 }
      );
    }

    // Use anon client for signUp — this triggers the confirmation email via SMTP
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://redbot.app";
    console.log("[register] Attempting signUp for:", email, "siteUrl:", siteUrl);

    const { data: signUpData, error: signUpError } =
      await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization_name: organizationName,
          },
          emailRedirectTo: `${siteUrl}/api/auth/callback`,
        },
      });

    console.log("[register] signUp result:", {
      userId: signUpData?.user?.id,
      email: signUpData?.user?.email,
      confirmed: signUpData?.user?.email_confirmed_at,
      identities: signUpData?.user?.identities?.length,
      error: signUpError?.message,
    });

    if (signUpError || !signUpData.user) {
      return NextResponse.json(
        { error: signUpError?.message || "Error al crear usuario" },
        { status: 400 }
      );
    }

    // Check if user already existed (Supabase returns empty identities for duplicate signups)
    if (signUpData.user.identities && signUpData.user.identities.length === 0) {
      console.log("[register] User already exists (empty identities):", email);
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo electrónico" },
        { status: 400 }
      );
    }

    // Use admin client for org + profile creation (bypasses RLS)
    const supabase = createAdminClient();

    // Generate slug from org name
    let slug = generateSlug(organizationName);

    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingOrg) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Create organization with plan based on intent
    const selectedPlan = PLANS[planTier as PlanTier] || PLANS["basic"];
    const isBuy = intent === "buy";

    const trialEndsAt = isBuy
      ? null
      : new Date(Date.now() + selectedPlan.trialDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName,
        slug,
        email,
        plan_tier: planTier as PlanTier,
        plan_status: isBuy ? "unpaid" : "trialing",
        trial_ends_at: trialEndsAt,
        max_properties: selectedPlan.limits.maxProperties,
        max_agents: selectedPlan.limits.maxAgents,
        max_conversations_per_month: selectedPlan.limits.maxConversationsPerMonth,
      })
      .select()
      .single();

    if (orgError || !org) {
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return NextResponse.json(
        { error: "Error al crear organización" },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: signUpData.user.id,
        organization_id: org.id,
        role: "org_admin",
        full_name: fullName,
        email,
      });

    if (profileError) {
      await supabase.from("organizations").delete().eq("id", org.id);
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return NextResponse.json(
        { error: "Error al crear perfil" },
        { status: 500 }
      );
    }

    // Track affiliate referral (non-blocking — never fails registration)
    const refCode = request.cookies.get("redbot_ref")?.value;
    if (refCode) {
      try {
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id")
          .eq("referral_code", refCode)
          .eq("status", "active")
          .single();

        if (affiliate) {
          await supabase
            .from("organizations")
            .update({ referred_by_affiliate_id: affiliate.id })
            .eq("id", org.id);

          await supabase.from("affiliate_referrals").insert({
            affiliate_id: affiliate.id,
            referred_org_id: org.id,
            referral_code_used: refCode,
            status: "pending",
          });

          await supabase.rpc("increment_affiliate_referrals", {
            aff_id: affiliate.id,
          });

          console.log(`[register] Referral tracked: code=${refCode}, org=${org.id}`);
        }
      } catch (err) {
        console.error("[register] Affiliate referral tracking error:", err);
      }
    }

    return NextResponse.json({
      user: { id: signUpData.user.id, email },
      organization: { id: org.id, slug: org.slug, name: org.name },
      needsEmailConfirmation: true,
      planTier,
      intent,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
