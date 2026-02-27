import type {
  AffiliateType,
  AffiliateStatus,
  CommissionStatus,
  PayoutStatus,
  PayoutMethod,
  ReferralStatus,
} from "@/lib/supabase/types";

export interface AffiliateProfile {
  id: string;
  user_id: string;
  referral_code: string;
  display_name: string;
  email: string;
  phone: string | null;
  affiliate_type: AffiliateType;
  organization_id: string | null;
  status: AffiliateStatus;
  payout_method: PayoutMethod | null;
  payout_details: Record<string, unknown>;
  total_referrals: number;
  active_referrals: number;
  total_earned_cents: number;
  total_paid_cents: number;
  pending_balance_cents: number;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_org_id: string;
  status: ReferralStatus;
  referral_code_used: string;
  referred_at: string;
  converted_at: string | null;
  referred_plan_tier: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  referred_org?: { name: string; slug: string; plan_tier: string; plan_status: string };
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string;
  invoice_id: string | null;
  plan_tier: string;
  commission_rate_percent: number;
  base_amount_cents: number;
  commission_amount_cents: number;
  currency: string;
  status: CommissionStatus;
  payout_id: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  // Joined fields
  referral?: { referred_org?: { name: string } };
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount_cents: number;
  currency: string;
  payout_method: string;
  payout_details: Record<string, unknown>;
  status: PayoutStatus;
  processed_by: string | null;
  processed_at: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionRate {
  id: string;
  plan_tier: string;
  commission_percent: number;
  is_active: boolean;
}
