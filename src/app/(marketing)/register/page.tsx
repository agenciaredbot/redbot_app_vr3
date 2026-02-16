import Link from "next/link";
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
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
