import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertyEditWrapper } from "@/components/properties/property-edit-wrapper";

export const metadata = {
  title: "Editar propiedad",
};

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        Editar propiedad
      </h1>
      <PropertyEditWrapper property={property} />
    </div>
  );
}
