"use client";

import { useState, useEffect, useRef } from "react";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";

interface PaymentMethodFormProps {
  /** Called with card token + card info when tokenization succeeds */
  onTokenized?: (data: {
    cardTokenId: string;
    payerEmail: string;
    cardLastFour: string;
    cardBrand: string;
  }) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether this form is for subscribing (tokenize only) or saving a card */
  mode?: "subscribe" | "save";
  /** Called after successfully saving a card (mode="save") */
  onSuccess?: () => void;
}

/**
 * Payment method form — handles Mercado Pago card tokenization client-side.
 *
 * Uses @mercadopago/sdk-js for PCI-compliant tokenization.
 *
 * Flow:
 * 1. User enters card details + cédula (required in Colombia)
 * 2. Client-side tokenization via MP SDK (using public key)
 * 3a. mode="subscribe": Returns token to parent for subscription
 * 3b. mode="save": Sends display info to our backend
 *
 * Note: MP card tokens expire (~7 days), so for subscriptions we
 * tokenize at the moment of subscribing, not separately.
 */
export function PaymentMethodForm({
  onTokenized,
  onCancel,
  mode = "subscribe",
  onSuccess,
}: PaymentMethodFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mpRef = useRef<unknown>(null);

  // Load Mercado Pago SDK
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    if (!publicKey) {
      setError("Configuración de pago no disponible. Contacta soporte.");
      return;
    }

    const loadSDK = async () => {
      try {
        // Dynamic import for @mercadopago/sdk-js
        const { loadMercadoPago } = await import("@mercadopago/sdk-js");
        await loadMercadoPago();

        // Initialize MP with public key
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mp = new (window as any).MercadoPago(publicKey, {
          locale: "es-CO",
        });
        mpRef.current = mp;
        setSdkLoaded(true);
      } catch (err) {
        console.error("[payment-form] Failed to load MP SDK:", err);
        setError("Error al cargar el sistema de pagos. Recarga la página.");
      }
    };

    loadSDK();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mp = mpRef.current as any;
      if (!mp) {
        throw new Error("Sistema de pagos no inicializado. Recarga la página.");
      }

      // Tokenize card with Mercado Pago SDK
      const tokenData = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardholderName: cardHolder,
        cardExpirationMonth: expMonth.padStart(2, "0"),
        cardExpirationYear: expYear.length === 2 ? `20${expYear}` : expYear,
        securityCode: cvc,
        identificationType: "CC", // Cédula de ciudadanía (Colombia)
        identificationNumber: cedula,
      });

      if (!tokenData?.id) {
        throw new Error("Error al tokenizar la tarjeta. Verifica los datos.");
      }

      const cardTokenId = tokenData.id;
      // Extract card info from token response
      const lastFour = tokenData.last_four_digits || cardNumber.replace(/\s/g, "").slice(-4);
      const brand = (tokenData.card_number_length === 15 ? "amex" : "visa"); // Simplified brand detection

      if (mode === "subscribe" && onTokenized) {
        // Return token to parent for subscription flow
        onTokenized({
          cardTokenId,
          payerEmail: email,
          cardLastFour: lastFour,
          cardBrand: brand,
        });
      } else if (mode === "save") {
        // Save payment method display info to our backend
        const res = await fetch("/api/billing/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lastFour,
            brand,
            customerEmail: email,
            provider: "mercadopago",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al guardar método de pago");
        }

        onSuccess?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar tarjeta";
      // Parse MP SDK errors
      if (typeof err === "object" && err !== null && "cause" in err) {
        const causes = (err as { cause: Array<{ description: string }> }).cause;
        if (Array.isArray(causes) && causes.length > 0) {
          setError(causes.map((c) => c.description || c).join(". "));
          return;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {!sdkLoaded && !error && (
        <div className="p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-sm text-accent-cyan">
          Cargando sistema de pagos...
        </div>
      )}

      <GlassInput
        label="Titular de la tarjeta"
        placeholder="NOMBRE COMO APARECE EN LA TARJETA"
        value={cardHolder}
        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
        required
      />

      <GlassInput
        label="Número de tarjeta"
        placeholder="4111 1111 1111 1111"
        value={cardNumber}
        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
        required
        maxLength={19}
      />

      <div className="grid grid-cols-3 gap-3">
        <GlassInput
          label="Mes"
          placeholder="MM"
          value={expMonth}
          onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
          required
          maxLength={2}
        />
        <GlassInput
          label="Año"
          placeholder="AA"
          value={expYear}
          onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 2))}
          required
          maxLength={2}
        />
        <GlassInput
          label="CVC"
          placeholder="123"
          value={cvc}
          onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
          required
          maxLength={4}
          type="password"
        />
      </div>

      <GlassInput
        label="Número de cédula"
        placeholder="1234567890"
        value={cedula}
        onChange={(e) => setCedula(e.target.value.replace(/\D/g, "").slice(0, 12))}
        required
        maxLength={12}
      />

      <GlassInput
        label="Email de facturación"
        type="email"
        placeholder="correo@empresa.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <p className="text-xs text-text-muted">
        Tus datos de pago son procesados de forma segura por Mercado Pago. No almacenamos información de tarjeta.
      </p>

      <div className="flex gap-3 pt-2">
        <GlassButton
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </GlassButton>
        <GlassButton
          type="submit"
          loading={loading}
          disabled={!sdkLoaded}
          className="flex-1"
        >
          {mode === "subscribe" ? "Continuar con el pago" : "Guardar tarjeta"}
        </GlassButton>
      </div>
    </form>
  );
}
