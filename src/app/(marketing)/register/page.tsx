import Link from "next/link";
import Image from "next/image";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
          <div className="text-center mb-8">
            <Image
              src="/redbot-logo-dark-background.png"
              alt="Redbot"
              width={180}
              height={50}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-text-primary">
              Crea tu cuenta
            </h1>
            <p className="text-text-secondary mt-1">
              Comienza a gestionar tus propiedades con IA
            </p>
          </div>

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
