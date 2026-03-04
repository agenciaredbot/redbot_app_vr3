import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/config/plans";
import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";
import type { PlanTier } from "@/lib/supabase/types";

export const metadata = {
  title: "Checkout - Redbot",
  description: "Completa tu compra para activar tu plan",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    org?: string;
    payment?: string;
  }>;
}) {
  const { plan, org: orgId, payment } = await searchParams;

  // Validate required params
  if (!plan || !orgId) {
    return (
      <CheckoutLayout>
        <ErrorState message="Enlace de checkout inválido. Por favor regresa e intenta de nuevo." />
      </CheckoutLayout>
    );
  }

  const planTier = plan as PlanTier;
  if (!PLANS[planTier]) {
    return (
      <CheckoutLayout>
        <ErrorState message="Plan no válido." />
      </CheckoutLayout>
    );
  }

  // Payment return states
  if (payment === "success") {
    return (
      <CheckoutLayout>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-accent-green/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            ¡Pago exitoso!
          </h1>
          <p className="text-text-secondary max-w-md mx-auto">
            Tu plan <strong className="text-text-primary">{PLANS[planTier].name}</strong> ha sido activado.
            Revisa tu correo electrónico para verificar tu cuenta y acceder al panel de administración.
          </p>
          <div className="p-4 rounded-xl bg-accent-blue/10 border border-accent-blue/20">
            <p className="text-sm text-accent-blue">
              📧 Busca el correo de verificación en tu bandeja de entrada (revisa también spam)
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  if (payment === "failure") {
    return (
      <CheckoutLayout>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-accent-red/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Error en el pago
          </h1>
          <p className="text-text-secondary">
            No pudimos procesar tu pago. Por favor intenta de nuevo.
          </p>
          <Link
            href={`/checkout?plan=${plan}&org=${orgId}`}
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity"
          >
            Reintentar pago
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  if (payment === "pending") {
    return (
      <CheckoutLayout>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-accent-yellow/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Pago pendiente
          </h1>
          <p className="text-text-secondary max-w-md mx-auto">
            Tu pago está siendo procesado. Te notificaremos cuando se confirme.
            Mientras tanto, verifica tu correo electrónico.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  // Fetch org to validate it exists and is unpaid
  const supabase = createAdminClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, email, plan_status, plan_tier")
    .eq("id", orgId)
    .single();

  if (!org || org.plan_status !== "unpaid") {
    return (
      <CheckoutLayout>
        <ErrorState message="Este enlace de checkout ya no es válido. Si ya pagaste, verifica tu correo electrónico para acceder a tu cuenta." />
      </CheckoutLayout>
    );
  }

  return (
    <CheckoutLayout>
      <CheckoutPageClient
        organizationId={org.id}
        organizationName={org.name}
        planTier={planTier}
      />
    </CheckoutLayout>
  );
}

function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple navbar */}
      <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-border-glass">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-6">
          <Link href="/">
            <Image
              src="/redbot-logo-dark background-variant.png"
              alt="Redbot"
              width={120}
              height={34}
              className="h-8 w-auto"
            />
          </Link>
          <Link
            href="/login"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-accent-red/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-text-secondary">{message}</p>
      <Link
        href="/"
        className="inline-block px-6 py-3 rounded-xl border border-border-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-all"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
