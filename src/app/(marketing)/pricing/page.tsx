import Link from "next/link";
import Image from "next/image";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata = {
  title: "Planes y precios - Redbot",
  description:
    "Elige el plan ideal para tu inmobiliaria. Automatiza la gestión de propiedades con IA.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
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
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Iniciar sesion
            </Link>
          </div>
        </div>
      </nav>

      {/* Pricing section with trial button enabled */}
      <PricingSection showTrialButton={true} />
    </div>
  );
}
