import { GlassCard } from "@/components/ui/glass-card";
import { GlassBadge } from "@/components/ui/glass-badge";
import { ImageGallery } from "./image-gallery";
import {
  formatPrice,
  formatPropertyType,
  formatBusinessType,
  formatArea,
  getI18nText,
} from "@/lib/utils/format";
import type { Property } from "@/lib/supabase/types";

interface PropertyDetailProps {
  property: Property;
}

export function PropertyDetail({ property }: PropertyDetailProps) {
  const title = getI18nText(property.title);
  const description = getI18nText(property.description);
  const images = (property.images as string[]) || [];
  const features = (property.features as string[]) || [];

  return (
    <div className="space-y-6">
      {/* Gallery */}
      <ImageGallery images={images} title={title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GlassBadge
                color={
                  property.business_type === "venta" ? "#10B981" : "#3B82F6"
                }
              >
                {formatBusinessType(property.business_type)}
              </GlassBadge>
              <GlassBadge color="#8B5CF6">
                {formatPropertyType(property.property_type)}
              </GlassBadge>
              {property.is_featured && (
                <GlassBadge color="#F59E0B">Destacado</GlassBadge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              {title}
            </h1>
            {property.city && (
              <p className="text-text-secondary mt-1">
                {[property.zone, property.locality, property.city, property.state_department]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          {/* Description */}
          {description && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                Descripción
              </h2>
              <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </GlassCard>
          )}

          {/* Specs */}
          <GlassCard>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Características
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {property.bedrooms > 0 && (
                <SpecItem label="Habitaciones" value={String(property.bedrooms)} />
              )}
              {property.bathrooms > 0 && (
                <SpecItem label="Baños" value={String(property.bathrooms)} />
              )}
              {property.parking_spots > 0 && (
                <SpecItem label="Parqueaderos" value={String(property.parking_spots)} />
              )}
              {property.built_area_m2 && (
                <SpecItem label="Área construida" value={formatArea(property.built_area_m2)} />
              )}
              {property.private_area_m2 && (
                <SpecItem label="Área privada" value={formatArea(property.private_area_m2)} />
              )}
              {property.land_area_m2 && (
                <SpecItem label="Área terreno" value={formatArea(property.land_area_m2)} />
              )}
              {property.stratum && (
                <SpecItem label="Estrato" value={String(property.stratum)} />
              )}
              {property.year_built && (
                <SpecItem label="Año" value={String(property.year_built)} />
              )}
            </div>
          </GlassCard>

          {/* Features */}
          {features.length > 0 && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                Comodidades
              </h2>
              <div className="flex flex-wrap gap-2">
                {features.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1.5 text-sm bg-bg-glass border border-border-glass rounded-lg text-text-secondary"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar — pricing */}
        <div className="space-y-4">
          <GlassCard className="sticky top-24">
            <div className="space-y-4">
              {property.sale_price > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">
                    Precio de venta
                  </p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatPrice(property.sale_price, property.currency)}
                  </p>
                </div>
              )}
              {property.rent_price > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">
                    Arriendo mensual
                  </p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatPrice(property.rent_price, property.currency)}
                    <span className="text-sm font-normal text-text-muted">
                      /mes
                    </span>
                  </p>
                </div>
              )}
              {property.admin_fee > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">
                    Administración
                  </p>
                  <p className="text-lg text-text-secondary">
                    {formatPrice(property.admin_fee, property.currency)}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
