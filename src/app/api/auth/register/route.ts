import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerSchema } from "@/lib/validators/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { isTrialEligible } from "@/config/plans";
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

    const { fullName, email, password, organizationName, planTier, intent, website } = parsed.data;

    // Honeypot check — bots fill hidden fields, humans don't
    if (website && website.length > 0) {
      // Return fake success to not alert the bot
      console.log("[register] Honeypot triggered, rejecting silently:", email);
      return NextResponse.json({
        needsEmailConfirmation: true,
      });
    }

    // Validate trial eligibility
    if (intent === "trial" && !isTrialEligible(planTier as PlanTier)) {
      return NextResponse.json(
        { error: "La prueba gratuita solo está disponible para el plan Starter" },
        { status: 400 }
      );
    }

    // Capture affiliate referral code from cookie (to store in metadata)
    const refCode = request.cookies.get("redbot_ref")?.value || "";

    // Use anon client for signUp — this triggers the confirmation email via SMTP
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://redbot.app";
    console.log("[register] Attempting signUp for:", email, "siteUrl:", siteUrl);

    // Store org details in user_metadata — org will be created AFTER email verification
    const { data: signUpData, error: signUpError } =
      await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization_name: organizationName,
            plan_tier: planTier,
            intent: intent,
            ref_code: refCode,
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

    // User created successfully — org + profile will be created in /api/auth/callback
    // after the user verifies their email
    return NextResponse.json({
      needsEmailConfirmation: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
