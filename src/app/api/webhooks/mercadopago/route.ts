import { NextRequest, NextResponse } from "next/server";
import { mercadopagoProvider } from "@/lib/billing/providers/mercadopago";
import { handleSubscriptionPayment } from "@/lib/billing/engine";

/**
 * POST /api/webhooks/mercadopago — Mercado Pago webhook handler
 *
 * Receives payment and subscription events from MP.
 * Verifies HMAC-SHA256 signature and processes payment results.
 *
 * No auth required — uses webhook signature verification instead.
 *
 * Relevant events:
 * - subscription_authorized_payment: Automatic subscription charge
 * - payment: Individual payment (may be from subscription)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") || "";
    const requestId = request.headers.get("x-request-id") || "";

    // Verify webhook signature
    if (!mercadopagoProvider.verifyWebhookSignature(rawBody, signature, requestId)) {
      console.error("[mp-webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const event = mercadopagoProvider.parseWebhookEvent(body);

    console.log(
      `[mp-webhook] Event: ${event.type} | Resource: ${event.resourceId}`
    );

    // Process based on event type
    switch (event.type) {
      case "subscription_authorized_payment":
      case "payment.approved": {
        // Payment from a subscription — process it
        if (event.resourceId) {
          await handleSubscriptionPayment(event.resourceId);
        }
        break;
      }

      case "payment.declined": {
        // Failed payment — MP will retry automatically
        // We'll pick it up via handleSubscriptionPayment which checks status
        if (event.resourceId) {
          await handleSubscriptionPayment(event.resourceId);
        }
        break;
      }

      case "subscription.updated": {
        // Subscription status changed in MP — logged for now
        // The cron job syncs MP status periodically as safety net
        console.log(
          `[mp-webhook] Subscription updated: ${event.resourceId}`
        );
        break;
      }

      default:
        console.log(
          `[mp-webhook] Unhandled event type: ${event.type} for resource: ${event.resourceId}`
        );
    }

    // Always respond 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[mp-webhook] Error processing webhook:", err);
    // Still return 200 to prevent MP from retrying indefinitely
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}
