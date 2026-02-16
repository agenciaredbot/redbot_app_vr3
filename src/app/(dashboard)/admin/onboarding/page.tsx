import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata = {
  title: "Configuración inicial",
};

export default function OnboardingPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <OnboardingWizard />
    </div>
  );
}
