/**
 * Payment Provider Factory
 *
 * Returns the appropriate payment provider based on name.
 * Default: Mercado Pago (Colombia, COP)
 */

import type { PaymentProvider, PaymentProviderName } from "./types";
import { mercadopagoProvider } from "./providers/mercadopago";
import { stripeProvider } from "./providers/stripe";

const providers: Record<PaymentProviderName, PaymentProvider> = {
  mercadopago: mercadopagoProvider,
  stripe: stripeProvider,
};

/**
 * Get a payment provider by name
 * @default "mercadopago"
 */
export function getPaymentProvider(
  name: PaymentProviderName = "mercadopago"
): PaymentProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown payment provider: ${name}`);
  }
  return provider;
}

/**
 * Get the default payment provider for new subscriptions
 */
export function getDefaultProvider(): PaymentProvider {
  return providers.mercadopago;
}
