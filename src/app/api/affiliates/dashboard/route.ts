import { NextResponse } from "next/server";
import { getAffiliateContext } from "@/lib/auth/get-affiliate-context";

/**
 * GET /api/affiliates/dashboard
 * Returns affiliate dashboard data: stats, recent referrals, recent commissions, referral link.
 */
export async function GET() {
  const ctx = await getAffiliateContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, affiliateId } = ctx;

  const [
    affiliateResult,
    referralsResult,
    commissionsResult,
    ratesResult,
  ] = await Promise.all([
    // Affiliate profile with stats
    supabase
      .from("affiliates")
      .select("*")
      .eq("id", affiliateId)
      .single(),
    // Recent referrals
    supabase
      .from("affiliate_referrals")
      .select("*, referred_org:organizations(name, slug, plan_tier, plan_status)")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .limit(10),
    // Recent commissions
    supabase
      .from("affiliate_commissions")
      .select("*, referral:affiliate_referrals(referred_org:organizations(name))")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .limit(10),
    // Commission rates
    supabase
      .from("affiliate_commission_rates")
      .select("plan_tier, commission_percent")
      .eq("is_active", true)
      .order("plan_tier"),
  ]);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";
  const isLocalhost = rootDomain.includes("localhost");
  const baseUrl = isLocalhost ? `http://${rootDomain}` : `https://${rootDomain}`;
  const referralCode = affiliateResult.data?.referral_code || "";
  const referralLink = `${baseUrl}/register?ref=${referralCode}`;

  return NextResponse.json({
    affiliate: affiliateResult.data,
    referrals: referralsResult.data || [],
    commissions: commissionsResult.data || [],
    rates: ratesResult.data || [],
    referralLink,
  });
}
