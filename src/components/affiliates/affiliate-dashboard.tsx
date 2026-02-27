"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassTabs } from "@/components/ui/glass-tabs";
import { AffiliateStatsCards } from "./affiliate-stats-cards";
import { AffiliateReferralLink } from "./affiliate-referral-link";
import { AffiliateReferralsTable } from "./affiliate-referrals-table";
import { AffiliateCommissionsTable } from "./affiliate-commissions-table";
import { AffiliatePayoutsTable } from "./affiliate-payouts-table";
import { AffiliatePayoutSettings } from "./affiliate-payout-settings";
import type { AffiliateProfile, AffiliateReferral, AffiliateCommission, CommissionRate } from "@/lib/affiliates/types";

interface DashboardData {
  affiliate: AffiliateProfile;
  referrals: AffiliateReferral[];
  commissions: AffiliateCommission[];
  rates: CommissionRate[];
  referralLink: string;
}

export function AffiliateDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliates/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching affiliate dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  if (!data?.affiliate) {
    return (
      <div className="text-center py-20 text-text-muted">
        Error al cargar datos del afiliado.
      </div>
    );
  }

  const { affiliate, referrals, commissions, rates, referralLink } = data;

  return (
    <div className="space-y-6">
      <AffiliateStatsCards affiliate={affiliate} />
      <AffiliateReferralLink referralLink={referralLink} referralCode={affiliate.referral_code} />

      <GlassTabs
        tabs={[
          {
            id: "referrals",
            label: "Mis Referidos",
            content: <AffiliateReferralsTable referrals={referrals} onRefresh={fetchData} />,
          },
          {
            id: "commissions",
            label: "Comisiones",
            content: (
              <AffiliateCommissionsTable
                commissions={commissions}
                rates={rates}
                onRefresh={fetchData}
              />
            ),
          },
          {
            id: "payouts",
            label: "Pagos Recibidos",
            content: <AffiliatePayoutsTable onRefresh={fetchData} />,
          },
          {
            id: "settings",
            label: "Configuración",
            content: <AffiliatePayoutSettings affiliate={affiliate} onSave={fetchData} />,
          },
        ]}
      />
    </div>
  );
}
