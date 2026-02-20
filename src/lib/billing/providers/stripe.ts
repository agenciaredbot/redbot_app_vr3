/**
 * Stripe Payment Provider — International (USD)
 *
 * Placeholder for future implementation.
 * Will use the `stripe` npm package for native subscription management.
 */

import type { PaymentProvider } from "../types";

export const stripeProvider: PaymentProvider = {
  name: "stripe",
  currency: "USD",

  async createPaymentSource() {
    throw new Error(
      "Stripe provider not implemented yet. Coming soon for international payments."
    );
  },

  async createSubscription() {
    throw new Error(
      "Stripe provider not implemented yet. Coming soon for international payments."
    );
  },

  async updateSubscription() {
    throw new Error(
      "Stripe provider not implemented yet. Coming soon for international payments."
    );
  },

  async cancelSubscription() {
    throw new Error(
      "Stripe provider not implemented yet. Coming soon for international payments."
    );
  },

  async getSubscriptionStatus() {
    throw new Error(
      "Stripe provider not implemented yet. Coming soon for international payments."
    );
  },

  verifyWebhookSignature(): boolean {
    throw new Error(
      "Stripe provider not implemented yet. Coming soon for international payments."
    );
  },

  parseWebhookEvent() {
    throw new Error(
      "Stripe provider not implemented yet. Coming soon for international payments."
    );
  },
};
