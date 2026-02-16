import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";
import { formatPrice, formatPropertyType, formatBusinessType, getI18nText } from "@/lib/utils/format";
import type { Property } from "@/lib/supabase/types";

interface PropertyCardProps {
  property: Property;
  slug: string;
}

export function PropertyCard({ property, slug }: PropertyCardProps) {
  const images = (property.images as string[]) || [];
  const title = getI18nText(property.title);
  const price =
    property.business_type === "arriendo"
      ? property.rent_price
      : property.sale_price;

  return (
    <Link href={`/propiedades/${property.slug}?slug=${slug}`}>
      <GlassCard
        variant="interactive"
        padding="none"
        className="overflow-hidden group"
      >
        {/* Image */}
        <div className="aspect-[4/3] bg-bg-secondary relative overflow-hidden">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[0]}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-text-muted opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"
                />
              </svg>
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <GlassBadge
              color={
                property.business_type === "venta"
                  ? "#10B981"
                  : "#3B82F6"
              }
            >
              {formatBusinessType(property.business_type)}
            </GlassBadge>
            {property.is_featured && (
              <GlassBadge color="#F59E0B">Destacado</GlassBadge>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-lg font-bold text-text-primary mb-1">
            {formatPrice(price, property.currency)}
            {property.business_type === "arriendo" && (
              <span className="text-sm font-normal text-text-muted">
                /mes
              </span>
            )}
          </p>
          <p className="text-sm text-text-primary font-medium truncate mb-2">
            {title}
          </p>

          {/* Specs */}
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
              </svg>
              {formatPropertyType(property.property_type)}
            </span>
            {property.bedrooms > 0 && (
              <span>{property.bedrooms} hab</span>
            )}
            {property.bathrooms > 0 && (
              <span>{property.bathrooms} ba</span>
            )}
            {property.built_area_m2 && (
              <span>{property.built_area_m2} m²</span>
            )}
          </div>

          {/* Location */}
          {property.city && (
            <p className="text-xs text-text-muted mt-2 truncate">
              {[property.zone, property.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </GlassCard>
    </Link>
  );
}
