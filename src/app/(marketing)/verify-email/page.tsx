import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Verifica tu email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8 text-center">
          <Image
            src="/redbot-logo-dark-background.png"
            alt="Redbot"
            width={180}
            height={50}
            className="mx-auto mb-6"
          />

          {/* Email icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Revisa tu correo
          </h1>

          <p className="text-text-secondary mb-1">
            Enviamos un enlace de verificación a:
          </p>

          {email && (
            <p className="text-accent-blue font-medium mb-4">
              {email}
            </p>
          )}

          <p className="text-sm text-text-muted mb-6">
            Haz clic en el enlace del correo para activar tu cuenta.
            Si no lo ves, revisa tu carpeta de spam.
          </p>

          <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-text-secondary mb-6">
            El enlace expira en 24 horas. Si no recibiste el correo,
            puedes intentar registrarte nuevamente.
          </div>

          <Link
            href="/login"
            className="block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium hover:opacity-90 transition-opacity text-center"
          >
            Ir a iniciar sesión
          </Link>

          <p className="mt-4 text-sm text-text-muted">
            ¿No recibiste el correo?{" "}
            <Link
              href="/register"
              className="text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Intentar de nuevo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
