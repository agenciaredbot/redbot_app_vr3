import { PropertyCard } from "./property-card";
import type { Property } from "@/lib/supabase/types";

interface PropertyGridProps {
  properties: Property[];
  slug: string;
}

export function PropertyGrid({ properties, slug }: PropertyGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} slug={slug} />
      ))}
    </div>
  );
}
