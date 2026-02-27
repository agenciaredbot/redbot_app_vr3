import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { affiliateActivateSchema } from "@/lib/validators/affiliate";
import { generateReferralCode } from "@/lib/affiliates/referral-code";

/**
 * POST /api/affiliates/activate
 * Allows an existing org_admin to activate as an affiliate (tenant type).
 * Auto-approved since they're already a verified tenant.
 */
export async function POST(request: Request) {
  const authResult = await getAuthContext({ allowedRoles: ["org_admin"] });
  if (authResult instanceof NextResponse) return authResult;
  const { userId, organizationId } = authResult;

  const supabase = createAdminClient();

  // Check if already an affiliate
  const { data: existing } = await supabase
    .from("affiliates")
    .select("id, status, referral_code")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json({
      message: "Ya tienes un perfil de afiliado",
      affiliate: existing,
    });
  }

  // Parse optional payout info
  let payoutMethod = null;
  let payoutDetails = {};
  try {
    const body = await request.json();
    const parsed = affiliateActivateSchema.safeParse(body);
    if (parsed.success) {
      payoutMethod = parsed.data.payoutMethod || null;
      payoutDetails = parsed.data.payoutDetails || {};
    }
  } catch {
    // Body is optional
  }

  // Get user profile info
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email, phone")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  // Generate unique referral code
  let referralCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: dup } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", referralCode)
      .single();
    if (!dup) break;
    referralCode = generateReferralCode();
    attempts++;
  }

  // Create affiliate record (auto-approved for tenants)
  const { data: affiliate, error } = await supabase
    .from("affiliates")
    .insert({
      user_id: userId,
      referral_code: referralCode,
      display_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      affiliate_type: "tenant",
      organization_id: organizationId,
      status: "active", // Auto-approved for existing tenants
      payout_method: payoutMethod,
      payout_details: payoutDetails,
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Error al activar como afiliado" },
      { status: 500 }
    );
  }

  return NextResponse.json({ affiliate });
}
