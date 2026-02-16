"use client";

import { useState } from "react";
import { PropertyForm } from "./property-form";
import { ImageUpload } from "./image-upload";
import type { Property } from "@/lib/supabase/types";

interface PropertyEditWrapperProps {
  property: Property;
}

export function PropertyEditWrapper({ property }: PropertyEditWrapperProps) {
  const [images, setImages] = useState<string[]>(
    (property.images as string[]) || []
  );

  return (
    <div className="space-y-6">
      <PropertyForm property={property} />
      <ImageUpload
        propertyId={property.id}
        images={images}
        onImagesChange={setImages}
      />
    </div>
  );
}
