/**
 * Mercado Pago Payment Provider — Colombia (COP)
 *
 * Uses MP's native subscription system via /preapproval API.
 * MP handles automatic recurring charges, retries, and cancellation.
 *
 * Key differences from Wompi:
 * - Native subscriptions (no need for our own billing engine state machine)
 * - Amounts in whole COP (80000), not centavos (8000000) — we convert
 * - Hosted checkout via init_point redirect (no card data on our side)
 * - Webhook verification via HMAC-SHA256 (not simple SHA256)
 *
 * API docs: https://www.mercadopago.com.co/developers/es/reference
 */

import crypto from "crypto";
import type {
  PaymentProvider,
  CreatePaymentSourceParams,
  PaymentSourceResult,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  ProviderSubscriptionResult,
  ProviderSubscriptionStatus,
  WebhookEvent,
  WebhookEventType,
} from "../types";

const MP_API_URL = "https://api.mercadopago.com";
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || "";

// ============================================================
// Helpers
// ============================================================

/**
 * Make authenticated request to Mercado Pago API
 */
async function mpRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${MP_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      `Mercado Pago API error: ${res.status}`;
    console.error("[mercadopago] API error:", { status: res.status, path, data });
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Convert COP centavos (DB) to whole COP (MP).
 * Our DB stores 8000000 (centavos) → MP expects 80000 (whole COP).
 */
function centavosToWhole(amountCents: number): number {
  return Math.round(amountCents / 100);
}

/**
 * Map MP preapproval status to our normalized status
 */
function mapMPSubscriptionStatus(mpStatus: string): ProviderSubscriptionStatus {
  switch (mpStatus) {
    case "authorized":
      return "authorized";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    case "pending":
      return "pending";
    default:
      return "pending";
  }
}

// ============================================================
// Mercado Pago Preapproval Response Types
// ============================================================

interface MPPreapprovalResponse {
  id: string;
  status: string;
  init_point?: string;
  next_payment_date?: string;
  auto_recurring?: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
  external_reference?: string;
  payer_email?: string;
  [key: string]: unknown;
}

interface MPPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string;
  description?: string;
  date_approved?: string;
  payer?: {
    email?: string;
  };
  [key: string]: unknown;
}

// ============================================================
// Mercado Pago Provider Implementation
// ============================================================

export const mercadopagoProvider: PaymentProvider = {
  name: "mercadopago",
  currency: "COP",

  /**
   * Save payment method display info.
   * MP manages cards internally via subscriptions — we only store display data.
   */
  async createPaymentSource(
    params: CreatePaymentSourceParams
  ): Promise<PaymentSourceResult> {
    const { lastFour, brand, type } = params;

    // Generate a display-only ID (MP manages actual card data)
    const displayId = `mp_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      providerPaymentSourceId: displayId,
      type,
      lastFour,
      brand: brand.toLowerCase(),
      status: "active",
    };
  },

  /**
   * Create a native MP subscription via POST /preapproval.
   *
   * MP will:
   * - Charge the card immediately (or after free trial)
   * - Auto-charge monthly on the same day
   * - Auto-retry up to 4 times over 10 days on failure
   * - Cancel after 3 consecutive rejections
   */
  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<ProviderSubscriptionResult> {
    const {
      cardTokenId,
      payerEmail,
      reason,
      amountCents,
      externalReference,
      backUrl,
      freeTrial,
    } = params;

    const transactionAmount = centavosToWhole(amountCents);

    const body: Record<string, unknown> = {
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: transactionAmount,
        currency_id: "COP",
        ...(freeTrial && {
          free_trial: {
            frequency: freeTrial.frequencyDays,
            frequency_type: "days",
          },
        }),
      },
      payer_email: payerEmail,
      external_reference: externalReference,
      back_url: backUrl,
    };

    // If card token provided → inline flow (authorized immediately)
    // If no card token → hosted checkout (pending, redirect to init_point)
    if (cardTokenId) {
      body.card_token_id = cardTokenId;
      body.status = "authorized";
    } else {
      body.status = "pending";
    }

    const response = await mpRequest<MPPreapprovalResponse>(
      "/preapproval",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return {
      providerSubscriptionId: response.id,
      status: mapMPSubscriptionStatus(response.status),
      nextPaymentDate: response.next_payment_date,
      initPoint: response.init_point,
      rawResponse: response as unknown as Record<string, unknown>,
    };
  },

  /**
   * Update an existing subscription (e.g., change plan amount).
   * PUT /preapproval/{id}
   */
  async updateSubscription(
    subscriptionId: string,
    params: UpdateSubscriptionParams
  ): Promise<ProviderSubscriptionResult> {
    const body: Record<string, unknown> = {};

    if (params.amountCents !== undefined) {
      body.auto_recurring = {
        transaction_amount: centavosToWhole(params.amountCents),
        currency_id: "COP",
      };
    }

    if (params.reason) {
      body.reason = params.reason;
    }

    const response = await mpRequest<MPPreapprovalResponse>(
      `/preapproval/${subscriptionId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );

    return {
      providerSubscriptionId: response.id,
      status: mapMPSubscriptionStatus(response.status),
      nextPaymentDate: response.next_payment_date,
      rawResponse: response as unknown as Record<string, unknown>,
    };
  },

  /**
   * Cancel a subscription.
   * PUT /preapproval/{id} with status: "cancelled"
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await mpRequest<MPPreapprovalResponse>(
      `/preapproval/${subscriptionId}`,
      {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      }
    );
  },

  /**
   * Get subscription status from MP.
   * GET /preapproval/{id}
   */
  async getSubscriptionStatus(
    subscriptionId: string
  ): Promise<ProviderSubscriptionResult> {
    const response = await mpRequest<MPPreapprovalResponse>(
      `/preapproval/${subscriptionId}`
    );

    return {
      providerSubscriptionId: response.id,
      status: mapMPSubscriptionStatus(response.status),
      nextPaymentDate: response.next_payment_date,
      rawResponse: response as unknown as Record<string, unknown>,
    };
  },

  /**
   * Verify Mercado Pago webhook signature.
   *
   * MP sends x-signature header with format: ts=TIMESTAMP,v1=HMAC_HEX
   * Manifest: id:{data.id};request-id:{x-request-id};ts:{ts};
   * HMAC: SHA256(manifest, WEBHOOK_SECRET)
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    requestId: string
  ): boolean {
    try {
      if (!MP_WEBHOOK_SECRET || !signature) return false;

      // Parse x-signature: ts=...,v1=...
      const parts: Record<string, string> = {};
      signature.split(",").forEach((part) => {
        const [key, ...valueParts] = part.split("=");
        parts[key.trim()] = valueParts.join("=").trim();
      });

      const ts = parts["ts"];
      const v1 = parts["v1"];

      if (!ts || !v1) return false;

      // Parse body to get data.id
      const body = JSON.parse(rawBody);
      const dataId = body?.data?.id;

      if (!dataId) return false;

      // Build manifest
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

      // Compute HMAC
      const expectedHmac = crypto
        .createHmac("sha256", MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest("hex");

      return expectedHmac === v1;
    } catch {
      return false;
    }
  },

  /**
   * Parse a Mercado Pago webhook payload into a normalized WebhookEvent.
   *
   * MP webhook body format:
   * { action: "payment.created", data: { id: "123" }, type: "payment" }
   * or
   * { action: "subscription_authorized_payment", data: { id: "123" }, type: "subscription_authorized_payment" }
   */
  parseWebhookEvent(body: Record<string, unknown>): WebhookEvent {
    const action = (body.action as string) || (body.type as string) || "";
    const data = body.data as Record<string, unknown> | undefined;
    const resourceId = String(data?.id || "");

    // Map MP action to our event type
    let eventType: WebhookEventType;
    const bodyType = body.type as string | undefined;

    if (action.includes("subscription_authorized_payment")) {
      eventType = "subscription_authorized_payment";
    } else if (
      bodyType === "subscription_preapproval" ||
      action.includes("subscription_preapproval")
    ) {
      eventType = "subscription_preapproval";
    } else if (action.includes("payment")) {
      eventType = "payment.approved"; // We'll verify actual status via API
    } else {
      eventType = "subscription.updated";
    }

    return {
      type: eventType,
      resourceId,
      rawPayload: body,
    };
  },
};

/**
 * Fetch full payment details from MP.
 * Used by webhook handler to get complete payment info.
 */
export async function getMPPaymentDetails(
  paymentId: string
): Promise<MPPaymentResponse> {
  return mpRequest<MPPaymentResponse>(`/v1/payments/${paymentId}`);
}

/**
 * Search MP payments by preapproval (subscription) ID.
 * Useful for syncing payment history.
 */
export async function getMPPreapprovalPayments(
  preapprovalId: string
): Promise<MPPaymentResponse[]> {
  const response = await mpRequest<{ results: MPPaymentResponse[] }>(
    `/preapproval/search?preapproval_id=${preapprovalId}`
  );
  return response.results || [];
}
