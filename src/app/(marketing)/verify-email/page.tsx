import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export const metadata = {
  title: "Verifica tu email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return <VerifyEmailClient email={email || null} />;
}
