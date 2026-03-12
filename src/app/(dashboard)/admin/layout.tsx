import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { GradientBackground } from "@/components/ui/gradient-background";
import { StoreHydrator } from "@/components/providers/store-hydrator";
import { SubscriptionBlockedScreen } from "@/components/billing/subscription-blocked-screen";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { PLANS } from "@/config/plans";
import { IMPERSONATION_COOKIE_NAME } from "@/lib/auth/impersonation";
import type { Organization, UserProfile, PlanTier } from "@/lib/supabase/types";

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // --- Impersonation: super_admin can manage any org ---
  const isSuperAdmin = profile.role === "super_admin";
  let isImpersonating = false;
  let targetOrgId = profile.organization_id;

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const impCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
    if (impCookie?.value) {
      targetOrgId = impCookie.value;
      isImpersonating = true;
    }
  }

  if (!targetOrgId) {
    redirect("/login");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", targetOrgId)
    .single();

  if (!org) {
    redirect("/login");
  }

  // Guard: if user is on a tenant subdomain that doesn't match their org,
  // redirect them to their correct subdomain admin panel.
  // Skip this guard when super_admin is impersonating.
  const headersList = await headers();
  const subdomainSlug = headersList.get("x-organization-slug");

  if (subdomainSlug && subdomainSlug !== org.slug && !isImpersonating) {
    redirect(`https://${org.slug}.${rootDomain}/admin`);
  }

  // ============================================================
  // Subscription status check — block access for expired/unpaid orgs
  // Skip when super_admin is impersonating.
  // ============================================================
  const pathname = headersList.get("x-pathname") || "";
  const isBillingPage = pathname.includes("/admin/billing");

  if (!isBillingPage && !isImpersonating) {
    const blockedStatuses = ["unpaid", "canceled"];
    const isStatusBlocked = blockedStatuses.includes(org.plan_status);
    const isExpiredTrial =
      org.plan_status === "trialing" &&
      org.trial_ends_at &&
      new Date(org.trial_ends_at) < new Date();

    if (isStatusBlocked || isExpiredTrial) {
      // Grace period: check if there's a pending subscription (payment in progress)
      const supabaseAdmin = await createClient();
      const { data: pendingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("organization_id", org.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (!pendingSub) {
        const planName = PLANS[org.plan_tier as PlanTier]?.name;
        const reason = isExpiredTrial
          ? "trial_expired"
          : org.plan_status === "canceled"
            ? "canceled"
            : "unpaid";

        return (
          <div className="min-h-screen">
            <GradientBackground />
            <SubscriptionBlockedScreen reason={reason} planName={planName} />
          </div>
        );
      }
    }
  }

  return (
    <div className="min-h-screen">
      <GradientBackground />
      <StoreHydrator
        user={profile as UserProfile}
        organization={org as Organization}
      />
      {isImpersonating && (
        <ImpersonationBanner orgName={org.name || "Organización"} />
      )}
      <AdminSidebar orgName={org.name || "Mi Empresa"} />
      <div className="ml-64">
        <AdminHeader
          userName={profile.full_name}
          userEmail={profile.email}
          isSuperAdmin={isSuperAdmin}
        />
        <main className={`p-6 ${isImpersonating ? "mt-10" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
