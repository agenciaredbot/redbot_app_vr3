/**
 * Billing Engine — Mercado Pago Native Subscriptions
 *
 * Simplified coordination layer that delegates subscription management
 * to Mercado Pago's native /preapproval API.
 *
 * MP handles automatically:
 * - Monthly recurring charges
 * - Retry logic (up to 4 attempts in 10 days)
 * - Cancellation after 3 consecutive rejections
 * - Free trials
 *
 * Our engine handles:
 * - Creating/updating/canceling subscriptions via MP
 * - Processing webhook events (payment confirmations)
 * - Syncing org limits from plan config
 * - Cancel-at-period-end logic (MP cancels immediately, we defer)
 * - Monthly conversation counter resets
 *
 * Uses adminClient (service role) to bypass RLS for all billing operations.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "./provider";
import { PLANS, getPlanPrice } from "@/config/plans";
import type {
  PaymentProviderName,
  SubscriptionStatus,
  SubscribeParams,
  ChangePlanParams,
  SubscriptionInfo,
  InvoiceInfo,
} from "./types";
import type { PlanTier } from "@/lib/supabase/types";

// ============================================================
// Helpers
// ============================================================

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ============================================================
// Subscribe (MP Native Subscription)
// ============================================================

/**
 * Create a new subscription for an organization.
 *
 * Two flows:
 * - **Hosted checkout** (no cardTokenId): Creates pending subscription in MP,
 *   returns `initPoint` URL. User completes payment on mercadopago.com.
 *   Org is activated later via webhook (handleSubscriptionPreapproval).
 * - **Inline** (with cardTokenId): Charges immediately, activates org now.
 */
export async function subscribe(params: SubscribeParams): Promise<{
  subscriptionId: string;
  providerSubscriptionId: string;
  initPoint?: string;
}> {
  const {
    organizationId,
    planTier,
    cardTokenId,
    payerEmail,
    provider: providerName,
  } = params;

  const supabase = createAdminClient();
  const resolvedProvider = providerName || "mercadopago";
  const paymentProvider = getPaymentProvider(resolvedProvider as PaymentProviderName);
  const currency = paymentProvider.currency;
  const amountCents = getPlanPrice(planTier, currency);

  // Check for existing active/pending subscription
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("organization_id", organizationId)
    .not("status", "in", '("canceled")')
    .single();

  if (existingSub) {
    // If there's a stale pending subscription, cancel it in MP and delete it
    if (existingSub.status === "pending") {
      await supabase.from("subscriptions").delete().eq("id", existingSub.id);
    } else {
      throw new Error("Ya existe una suscripción activa. Cancela la actual primero.");
    }
  }

  // Get org info
  const { data: org } = await supabase
    .from("organizations")
    .select("email, trial_ends_at")
    .eq("id", organizationId)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://redbot.app";

  // Check if org is in trial (offer free trial for first subscription)
  const isInTrial = org?.trial_ends_at && new Date(org.trial_ends_at) > new Date();
  const trialDaysRemaining = isInTrial
    ? Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const isHostedCheckout = !cardTokenId;

  // Create MP subscription
  const mpResult = await paymentProvider.createSubscription({
    cardTokenId,
    payerEmail,
    reason: `Redbot ${PLANS[planTier].name} — Mensual`,
    amountCents,
    currency,
    externalReference: organizationId,
    backUrl: `${appUrl}/admin/billing`,
    ...(trialDaysRemaining > 0 && {
      freeTrial: { frequencyDays: trialDaysRemaining },
    }),
  });

  // Determine initial subscription status
  const now = new Date();
  const periodEnd = trialDaysRemaining > 0
    ? addDays(now, trialDaysRemaining)
    : addMonths(now, 1);

  let initialStatus: string;
  if (isHostedCheckout) {
    initialStatus = "pending"; // Waiting for user to complete on MP
  } else if (trialDaysRemaining > 0) {
    initialStatus = "trialing";
  } else {
    initialStatus = "active";
  }

  // Create subscription record in our DB
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: organizationId,
      provider: resolvedProvider,
      plan_tier: planTier,
      status: initialStatus as SubscriptionStatus,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      amount_cents: amountCents,
      currency,
      provider_subscription_id: mpResult.providerSubscriptionId,
      ...(trialDaysRemaining > 0 && {
        trial_ends_at: periodEnd.toISOString(),
      }),
    })
    .select("id")
    .single();

  if (subError || !subscription) {
    // Try to cancel the MP subscription if DB insert failed
    try {
      await paymentProvider.cancelSubscription(mpResult.providerSubscriptionId);
    } catch {
      console.error("[billing] Failed to rollback MP subscription after DB error");
    }
    throw new Error(`Error al crear suscripción: ${subError?.message}`);
  }

  // Only activate org immediately for inline flow
  // For hosted checkout, activation happens in handleSubscriptionPreapproval (webhook)
  if (!isHostedCheckout) {
    await syncLimits(organizationId, planTier);
    await updateOrgPlanStatus(
      organizationId,
      planTier,
      trialDaysRemaining > 0 ? "trialing" : "active",
      resolvedProvider
    );
  }

  return {
    subscriptionId: subscription.id,
    providerSubscriptionId: mpResult.providerSubscriptionId,
    initPoint: mpResult.initPoint,
  };
}

// ============================================================
// Handle Subscription Preapproval (from webhook — hosted checkout)
// ============================================================

/**
 * Handle a subscription_preapproval webhook event.
 * Called when the user completes payment on MP's hosted checkout.
 * Transitions subscription from "pending" → "active"/"trialing".
 */
export async function handleSubscriptionPreapproval(
  preapprovalId: string
): Promise<void> {
  const supabase = createAdminClient();
  const paymentProvider = getPaymentProvider("mercadopago");

  // Fetch current status from MP
  const mpStatus = await paymentProvider.getSubscriptionStatus(preapprovalId);

  if (mpStatus.status !== "authorized") {
    console.log(
      `[billing] Preapproval ${preapprovalId} status: ${mpStatus.status} (no activation needed)`
    );
    return;
  }

  // Find our pending subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("provider_subscription_id", preapprovalId)
    .single();

  if (!sub) {
    console.error(`[billing] No subscription found for preapproval ${preapprovalId}`);
    return;
  }

  // Only process if still pending (idempotency)
  if (sub.status !== "pending") {
    console.log(`[billing] Subscription ${sub.id} already ${sub.status}, skipping`);
    return;
  }

  const now = new Date();
  const hasTrial = sub.trial_ends_at && new Date(sub.trial_ends_at) > now;
  const newStatus = hasTrial ? "trialing" : "active";

  // Activate subscription
  await supabase
    .from("subscriptions")
    .update({
      status: newStatus as SubscriptionStatus,
      current_period_start: now.toISOString(),
      current_period_end: hasTrial
        ? sub.trial_ends_at
        : addMonths(now, 1).toISOString(),
    })
    .eq("id", sub.id);

  // Activate org
  await syncLimits(sub.organization_id, sub.plan_tier);
  await updateOrgPlanStatus(
    sub.organization_id,
    sub.plan_tier,
    newStatus,
    "mercadopago"
  );

  console.log(
    `[billing] Activated subscription ${sub.id} for org ${sub.organization_id} (${newStatus})`
  );
}

// ============================================================
// Handle Subscription Payment (from webhook)
// ============================================================

/**
 * Handle a subscription payment event from MP webhook.
 * Called when MP processes an automatic recurring charge.
 *
 * Flow:
 * 1. Webhook arrives with payment ID
 * 2. Fetch full payment details from MP API
 * 3. Find our subscription by external_reference (org ID)
 * 4. Create invoice record
 * 5. Update subscription period if approved
 */
export async function handleSubscriptionPayment(
  paymentId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Fetch payment details from MP
  const { getMPPaymentDetails } = await import("./providers/mercadopago");
  const payment = await getMPPaymentDetails(paymentId);

  const orgId = payment.external_reference;
  if (!orgId) {
    console.error(`[billing] Payment ${paymentId} has no external_reference`);
    return;
  }

  // Find our subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("provider", "mercadopago")
    .not("status", "eq", "canceled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    console.error(`[billing] No active subscription found for org ${orgId}`);
    return;
  }

  // Check for duplicate (idempotency)
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("provider_transaction_id", String(payment.id))
    .single();

  if (existingInvoice) {
    return; // Already processed
  }

  // Convert MP amount (whole COP) to centavos for our DB
  const amountCents = Math.round(payment.transaction_amount * 100);

  const now = new Date();
  const periodEnd = addMonths(now, 1);

  // Determine invoice status based on MP payment status
  const isPaid = payment.status === "approved";
  const isFailed = ["rejected", "cancelled", "refunded"].includes(payment.status);

  // Create invoice
  await supabase.from("invoices").insert({
    organization_id: orgId,
    subscription_id: sub.id,
    provider: "mercadopago",
    provider_transaction_id: String(payment.id),
    amount_cents: amountCents,
    currency: "COP",
    status: isPaid ? "paid" : isFailed ? "failed" : "pending",
    period_start: now.toISOString(),
    period_end: periodEnd.toISOString(),
    paid_at: isPaid && payment.date_approved ? payment.date_approved : null,
    failure_reason: isFailed ? `MP status: ${payment.status} (${payment.status_detail})` : null,
    metadata: { mp_payment_id: payment.id, mp_status: payment.status },
  });

  // Update subscription based on payment result
  if (isPaid) {
    await supabase
      .from("subscriptions")
      .update({
        status: "active" as SubscriptionStatus,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        retry_count: 0,
        next_retry_at: null,
      })
      .eq("id", sub.id);

    await syncLimits(orgId, sub.plan_tier);
    await updateOrgPlanStatus(orgId, sub.plan_tier, "active", "mercadopago");
  } else if (isFailed) {
    // MP will auto-retry — we just update our status
    const newRetryCount = (sub.retry_count || 0) + 1;

    await supabase
      .from("subscriptions")
      .update({
        status: "past_due" as SubscriptionStatus,
        retry_count: newRetryCount,
      })
      .eq("id", sub.id);

    await updateOrgPlanStatus(orgId, sub.plan_tier, "past_due", "mercadopago");
  }
}

// ============================================================
// Change Plan
// ============================================================

/**
 * Change the plan tier for a subscription.
 * Updates the MP subscription amount for next charge.
 */
export async function changePlan(params: ChangePlanParams): Promise<void> {
  const { organizationId, newPlanTier } = params;
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trialing", "past_due"])
    .single();

  if (!sub) {
    throw new Error("No se encontró una suscripción activa");
  }

  if (sub.plan_tier === newPlanTier) {
    throw new Error("Ya estás en ese plan");
  }

  const provider = getPaymentProvider(sub.provider as PaymentProviderName);
  const newAmountCents = getPlanPrice(newPlanTier, provider.currency);

  // Update in MP if we have a provider subscription ID
  if (sub.provider_subscription_id) {
    await provider.updateSubscription(sub.provider_subscription_id, {
      amountCents: newAmountCents,
      reason: `Redbot ${PLANS[newPlanTier].name} — Mensual`,
    });
  }

  // Update the subscription plan + amount in our DB
  await supabase
    .from("subscriptions")
    .update({
      plan_tier: newPlanTier,
      amount_cents: newAmountCents,
    })
    .eq("id", sub.id);

  // Immediately sync limits (both upgrade and downgrade take effect now)
  await syncLimits(organizationId, newPlanTier);

  // Update org plan_tier
  await supabase
    .from("organizations")
    .update({ plan_tier: newPlanTier })
    .eq("id", organizationId);
}

// ============================================================
// Cancel
// ============================================================

/**
 * Cancel subscription at end of current period.
 * We don't cancel in MP immediately — the cron handles that when the period ends.
 */
export async function cancelSubscription(organizationId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("organization_id", organizationId)
    .not("status", "eq", "canceled")
    .single();

  if (!sub) {
    throw new Error("No se encontró una suscripción activa");
  }

  await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("id", sub.id);
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(organizationId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, cancel_at_period_end")
    .eq("organization_id", organizationId)
    .eq("cancel_at_period_end", true)
    .single();

  if (!sub) {
    throw new Error("No hay suscripción pendiente de cancelación");
  }

  await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: false })
    .eq("id", sub.id);
}

// ============================================================
// Query Helpers
// ============================================================

/**
 * Get current subscription info for an organization
 */
export async function getSubscriptionInfo(
  organizationId: string
): Promise<SubscriptionInfo | null> {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .not("status", "eq", "canceled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) return null;

  return {
    id: sub.id,
    organizationId: sub.organization_id,
    planTier: sub.plan_tier,
    status: sub.status,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    trialEndsAt: sub.trial_ends_at,
    amountCents: sub.amount_cents,
    currency: sub.currency,
    retryCount: sub.retry_count,
    providerSubscriptionId: sub.provider_subscription_id || null,
  };
}

/**
 * Get invoices for an organization
 */
export async function getInvoices(
  organizationId: string,
  limit = 20
): Promise<InvoiceInfo[]> {
  const supabase = createAdminClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!invoices) return [];

  return invoices.map((inv) => ({
    id: inv.id,
    providerTransactionId: inv.provider_transaction_id,
    amountCents: inv.amount_cents,
    currency: inv.currency,
    status: inv.status,
    periodStart: inv.period_start,
    periodEnd: inv.period_end,
    paidAt: inv.paid_at,
    failureReason: inv.failure_reason,
    createdAt: inv.created_at,
  }));
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Sync organization limits from plan config
 */
async function syncLimits(
  organizationId: string,
  planTier: string
): Promise<void> {
  const plan = PLANS[planTier as PlanTier];
  if (!plan) return;

  const supabase = createAdminClient();

  await supabase
    .from("organizations")
    .update({
      max_properties: plan.limits.maxProperties,
      max_agents: plan.limits.maxAgents,
      max_conversations_per_month: plan.limits.maxConversationsPerMonth,
    })
    .eq("id", organizationId);
}

/**
 * Update the denormalized plan_tier and plan_status on organizations table
 */
async function updateOrgPlanStatus(
  organizationId: string,
  planTier: string,
  planStatus: string,
  provider: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("organizations")
    .update({
      plan_tier: planTier,
      plan_status: planStatus,
      payment_provider: provider,
    })
    .eq("id", organizationId);
}

// ============================================================
// Cron Tasks (Simplified — MP handles renewals & retries)
// ============================================================

/**
 * Process billing cron tasks.
 * Called by /api/cron/billing
 *
 * Simplified vs. Wompi version:
 * - NO renewal logic (MP charges automatically)
 * - NO retry logic (MP retries automatically)
 * - YES: cancel-at-period-end processing
 * - YES: trial expiry handling
 * - YES: monthly conversation counter reset
 * - YES: sync status with MP as safety net
 */
export async function processBillingCron(): Promise<{
  canceledAtPeriodEnd: number;
  expiredTrials: number;
  statusSynced: number;
  conversationsReset: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const errors: string[] = [];
  let canceledAtPeriodEnd = 0;
  let expiredTrials = 0;
  let statusSynced = 0;
  let conversationsReset = 0;

  // 1. Process cancel-at-period-end subscriptions
  const { data: toCancel } = await supabase
    .from("subscriptions")
    .select("id, organization_id, plan_tier, provider, provider_subscription_id")
    .eq("cancel_at_period_end", true)
    .in("status", ["active", "past_due"])
    .lt("current_period_end", now)
    .limit(50);

  for (const sub of toCancel || []) {
    try {
      // Cancel in MP
      if (sub.provider_subscription_id) {
        const provider = getPaymentProvider(sub.provider as PaymentProviderName);
        await provider.cancelSubscription(sub.provider_subscription_id);
      }

      // Update our DB
      await supabase
        .from("subscriptions")
        .update({
          status: "canceled" as SubscriptionStatus,
          cancel_at_period_end: false,
        })
        .eq("id", sub.id);

      await updateOrgPlanStatus(sub.organization_id, sub.plan_tier, "canceled", sub.provider);
      canceledAtPeriodEnd++;
    } catch (err) {
      errors.push(`Cancel failed for org ${sub.organization_id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // 2. Expire trials
  const { data: trialSubs } = await supabase
    .from("subscriptions")
    .select("id, organization_id, plan_tier, provider")
    .eq("status", "trialing")
    .lt("trial_ends_at", now)
    .limit(50);

  for (const sub of trialSubs || []) {
    try {
      // Trial ended — MP should have charged. If no payment webhook came,
      // mark as unpaid so user sees they need to take action.
      await supabase
        .from("subscriptions")
        .update({ status: "unpaid" as SubscriptionStatus })
        .eq("id", sub.id);

      await updateOrgPlanStatus(sub.organization_id, sub.plan_tier, "unpaid", sub.provider);
      expiredTrials++;
    } catch (err) {
      errors.push(`Trial expiry failed for org ${sub.organization_id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // 3. Sync status with MP (safety net — fetch status for active subs)
  const { data: activeSubs } = await supabase
    .from("subscriptions")
    .select("id, organization_id, plan_tier, provider, provider_subscription_id, status")
    .eq("provider", "mercadopago")
    .not("status", "eq", "canceled")
    .not("provider_subscription_id", "is", null)
    .limit(50);

  for (const sub of activeSubs || []) {
    try {
      if (!sub.provider_subscription_id) continue;

      const provider = getPaymentProvider(sub.provider as PaymentProviderName);
      const mpStatus = await provider.getSubscriptionStatus(sub.provider_subscription_id);

      // If MP says cancelled but we don't have it as canceled, sync
      if (mpStatus.status === "cancelled" && sub.status !== "canceled") {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" as SubscriptionStatus })
          .eq("id", sub.id);

        await updateOrgPlanStatus(sub.organization_id, sub.plan_tier, "canceled", sub.provider);
        statusSynced++;
      }
      // If MP says paused (too many failures) and we're still "active"
      else if (mpStatus.status === "paused" && sub.status === "active") {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" as SubscriptionStatus })
          .eq("id", sub.id);

        await updateOrgPlanStatus(sub.organization_id, sub.plan_tier, "past_due", sub.provider);
        statusSynced++;
      }
    } catch (err) {
      // Don't fail the whole cron if one sync fails
      errors.push(`Sync failed for org ${sub.organization_id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // 4. Reset monthly conversation counters
  const { data: toReset } = await supabase
    .from("organizations")
    .select("id")
    .lt("conversations_reset_at", now)
    .limit(100);

  for (const org of toReset || []) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await supabase
      .from("organizations")
      .update({
        conversations_used_this_month: 0,
        conversations_reset_at: nextReset.toISOString(),
      })
      .eq("id", org.id);

    conversationsReset++;
  }

  return { canceledAtPeriodEnd, expiredTrials, statusSynced, conversationsReset, errors };
}
