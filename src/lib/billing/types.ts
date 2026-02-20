/**
 * Billing system types — provider-agnostic
 * Supports Mercado Pago (COP) and future Stripe (USD)
 */

// ============================================================
// Provider Types
// ============================================================

export type PaymentProviderName = "mercadopago" | "stripe";
export type BillingCurrency = "COP" | "USD";
export type PaymentMethodType = "card";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type InvoiceStatus = "pending" | "paid" | "failed" | "refunded";

// ============================================================
// Payment Source / Method (display-only for MP)
// ============================================================

export interface CreatePaymentSourceParams {
  organizationId: string;
  /** Display info only — MP manages cards internally via subscriptions */
  lastFour: string;
  brand: string;
  type: PaymentMethodType;
  customerEmail: string;
}

export interface PaymentSourceResult {
  /** For MP, this is a display-only ID (not used for charges) */
  providerPaymentSourceId: string;
  type: PaymentMethodType;
  lastFour: string;
  brand: string;
  status: "active" | "inactive";
}

// ============================================================
// Subscription Management (MP native via /preapproval)
// ============================================================

export interface CreateSubscriptionParams {
  /** MP card token — omit for hosted checkout (redirect to MP) */
  cardTokenId?: string;
  /** Payer email — required by MP */
  payerEmail: string;
  /** Plan description (e.g., "Redbot Basic - Mensual") */
  reason: string;
  /** Amount in COP centavos (our DB format). Provider converts. */
  amountCents: number;
  currency: BillingCurrency;
  /** Organization ID for external_reference */
  externalReference: string;
  /** Back URL after MP redirect */
  backUrl: string;
  /** Free trial config */
  freeTrial?: {
    frequencyDays: number;
  };
}

export interface UpdateSubscriptionParams {
  /** New amount in COP centavos */
  amountCents?: number;
  /** New reason / description */
  reason?: string;
}

export type ProviderSubscriptionStatus =
  | "authorized"
  | "paused"
  | "cancelled"
  | "pending";

export interface ProviderSubscriptionResult {
  /** MP preapproval ID */
  providerSubscriptionId: string;
  status: ProviderSubscriptionStatus;
  /** Next payment date (ISO string) */
  nextPaymentDate?: string;
  /** MP hosted checkout URL — redirect user here to complete payment */
  initPoint?: string;
  /** Raw provider response */
  rawResponse?: Record<string, unknown>;
}

// ============================================================
// Webhooks
// ============================================================

export type WebhookEventType =
  | "subscription_authorized_payment"
  | "subscription_preapproval"
  | "payment.approved"
  | "payment.declined"
  | "payment.refunded"
  | "subscription.updated";

export interface WebhookEvent {
  type: WebhookEventType;
  /** MP payment ID or preapproval ID */
  resourceId: string;
  rawPayload: Record<string, unknown>;
}

// ============================================================
// Provider Interface
// ============================================================

export interface PaymentProvider {
  name: PaymentProviderName;
  currency: BillingCurrency;

  /** Save payment method display info (MP manages cards internally) */
  createPaymentSource(
    params: CreatePaymentSourceParams
  ): Promise<PaymentSourceResult>;

  /** Create a native subscription (MP /preapproval) */
  createSubscription(
    params: CreateSubscriptionParams
  ): Promise<ProviderSubscriptionResult>;

  /** Update an existing subscription (e.g., change plan amount) */
  updateSubscription(
    subscriptionId: string,
    params: UpdateSubscriptionParams
  ): Promise<ProviderSubscriptionResult>;

  /** Cancel a subscription in the provider */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /** Get subscription status from the provider */
  getSubscriptionStatus(
    subscriptionId: string
  ): Promise<ProviderSubscriptionResult>;

  /** Verify webhook signature — returns true if valid */
  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    requestId: string
  ): boolean;

  /** Parse raw webhook payload into normalized event */
  parseWebhookEvent(body: Record<string, unknown>): WebhookEvent;
}

// ============================================================
// Billing Engine Types
// ============================================================

export interface SubscribeParams {
  organizationId: string;
  planTier: "basic" | "power" | "omni";
  /** MP card token — omit for hosted checkout (redirect to MP) */
  cardTokenId?: string;
  /** Payer email */
  payerEmail: string;
  /** Override the provider (defaults to 'mercadopago') */
  provider?: PaymentProviderName;
}

export interface ChangePlanParams {
  organizationId: string;
  newPlanTier: "basic" | "power" | "omni";
}

export interface SubscriptionInfo {
  id: string;
  organizationId: string;
  planTier: "basic" | "power" | "omni";
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  amountCents: number;
  currency: BillingCurrency;
  retryCount: number;
  /** MP preapproval ID */
  providerSubscriptionId: string | null;
}

export interface InvoiceInfo {
  id: string;
  providerTransactionId: string | null;
  amountCents: number;
  currency: BillingCurrency;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
}
