import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { affiliateRegisterSchema } from "@/lib/validators/affiliate";
import { generateReferralCode } from "@/lib/affiliates/referral-code";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/affiliates/register
 * Public endpoint for external affiliate registration.
 * Creates auth user with role "affiliate" (no organization).
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per hour per IP
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.affiliateRegister);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos de registro. Intenta de nuevo más tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = affiliateRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email, password, phone, payoutMethod, payoutDetails } = parsed.data;

    // Create auth user via anon client (triggers email confirmation)
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://redbot.app";

    const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, is_affiliate: true },
        emailRedirectTo: `${siteUrl}/api/auth/callback`,
      },
    });

    if (signUpError || !signUpData.user) {
      return NextResponse.json(
        { error: signUpError?.message || "Error al crear usuario" },
        { status: 400 }
      );
    }

    if (signUpData.user.identities && signUpData.user.identities.length === 0) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo electrónico" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create user profile with role "affiliate" (no organization)
    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: signUpData.user.id,
      organization_id: null,
      role: "affiliate",
      full_name: fullName,
      email,
      phone: phone || null,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return NextResponse.json(
        { error: "Error al crear perfil" },
        { status: 500 }
      );
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("affiliates")
        .select("id")
        .eq("referral_code", referralCode)
        .single();
      if (!existing) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    // Create affiliate record
    const { error: affError } = await supabase.from("affiliates").insert({
      user_id: signUpData.user.id,
      referral_code: referralCode,
      display_name: fullName,
      email,
      phone: phone || null,
      affiliate_type: "external",
      organization_id: null,
      status: "pending", // Requires super-admin approval
      payout_method: payoutMethod || null,
      payout_details: payoutDetails || {},
    });

    if (affError) {
      await supabase.from("user_profiles").delete().eq("id", signUpData.user.id);
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return NextResponse.json(
        { error: "Error al crear perfil de afiliado" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Registro exitoso. Revisa tu correo para confirmar tu cuenta.",
      needsEmailConfirmation: true,
      needsApproval: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
