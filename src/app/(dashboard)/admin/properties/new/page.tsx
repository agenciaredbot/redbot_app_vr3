import { PropertyForm } from "@/components/properties/property-form";

export const metadata = {
  title: "Agregar propiedad",
};

export default function NewPropertyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        Agregar propiedad
      </h1>
      <PropertyForm />
    </div>
  );
}
