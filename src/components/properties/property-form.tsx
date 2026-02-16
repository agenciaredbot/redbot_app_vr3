"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertyFormSchema, type PropertyFormInput } from "@/lib/validators/property";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  PROPERTY_TYPES,
  BUSINESS_TYPES,
  PROPERTY_STATUS_OPTIONS,
  AVAILABILITY_OPTIONS,
  CURRENCY_OPTIONS,
  STRATUM_OPTIONS,
} from "@/config/constants";
import type { Property } from "@/lib/supabase/types";
import { getI18nText } from "@/lib/utils/format";

interface PropertyFormProps {
  property?: Property;
}

export function PropertyForm({ property }: PropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!property;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormInput>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: property
      ? {
          title_es: getI18nText(property.title),
          description_es: getI18nText(property.description),
          property_type: property.property_type,
          business_type: property.business_type,
          property_status: property.property_status,
          availability: property.availability,
          sale_price: property.sale_price,
          rent_price: property.rent_price,
          currency: property.currency,
          admin_fee: property.admin_fee,
          city: property.city || "",
          state_department: property.state_department || "",
          zone: property.zone || "",
          address: property.address || "",
          locality: property.locality || "",
          built_area_m2: property.built_area_m2 || undefined,
          private_area_m2: property.private_area_m2 || undefined,
          land_area_m2: property.land_area_m2 || undefined,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          parking_spots: property.parking_spots,
          stratum: property.stratum || undefined,
          year_built: property.year_built || undefined,
          features: property.features?.join(", ") || "",
          is_published: property.is_published,
          is_featured: property.is_featured,
          private_notes: property.private_notes || "",
          owner_name: property.owner_name || "",
          owner_phone: property.owner_phone || "",
          owner_email: property.owner_email || "",
          commission_value: property.commission_value || undefined,
          commission_type: property.commission_type,
        }
      : {
          currency: "COP",
          property_status: "usado",
          availability: "disponible",
          is_published: true,
        },
  });

  const onSubmit = async (data: PropertyFormInput) => {
    setLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/properties/${property!.id}`
        : "/api/properties";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || "Error al guardar");
        setLoading(false);
        return;
      }

      router.push("/admin/properties");
      router.refresh();
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Información básica
        </h2>
        <div className="space-y-4">
          <GlassInput
            label="Título"
            placeholder="Apartamento moderno en el norte de Bogotá"
            error={errors.title_es?.message}
            {...register("title_es")}
          />
          <GlassTextarea
            label="Descripción"
            placeholder="Describe la propiedad..."
            error={errors.description_es?.message}
            {...register("description_es")}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassSelect
              label="Tipo de inmueble"
              options={PROPERTY_TYPES}
              placeholder="Seleccionar..."
              error={errors.property_type?.message}
              {...register("property_type")}
            />
            <GlassSelect
              label="Tipo de negocio"
              options={BUSINESS_TYPES}
              placeholder="Seleccionar..."
              error={errors.business_type?.message}
              {...register("business_type")}
            />
            <GlassSelect
              label="Estado del inmueble"
              options={PROPERTY_STATUS_OPTIONS}
              {...register("property_status")}
            />
          </div>
        </div>
      </GlassCard>

      {/* Pricing */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Precio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassSelect
            label="Moneda"
            options={CURRENCY_OPTIONS.map((c) => ({
              value: c.value,
              label: c.label,
            }))}
            {...register("currency")}
          />
          <GlassInput
            label="Precio de venta"
            type="number"
            placeholder="0"
            {...register("sale_price")}
          />
          <GlassInput
            label="Precio de arriendo"
            type="number"
            placeholder="0"
            {...register("rent_price")}
          />
        </div>
        <div className="mt-4">
          <GlassInput
            label="Administración"
            type="number"
            placeholder="0"
            {...register("admin_fee")}
          />
        </div>
      </GlassCard>

      {/* Location */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Ubicación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput label="Ciudad" placeholder="Bogotá" {...register("city")} />
          <GlassInput
            label="Departamento"
            placeholder="Cundinamarca"
            {...register("state_department")}
          />
          <GlassInput label="Zona / Barrio" placeholder="Chapinero" {...register("zone")} />
          <GlassInput label="Localidad" {...register("locality")} />
          <GlassInput
            label="Dirección"
            placeholder="Calle 72 #10-34"
            className="md:col-span-2"
            {...register("address")}
          />
        </div>
      </GlassCard>

      {/* Specs */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Características
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassInput label="Habitaciones" type="number" {...register("bedrooms")} />
          <GlassInput label="Baños" type="number" {...register("bathrooms")} />
          <GlassInput label="Parqueaderos" type="number" {...register("parking_spots")} />
          <GlassSelect
            label="Estrato"
            options={STRATUM_OPTIONS.map((s) => ({
              value: String(s),
              label: String(s),
            }))}
            placeholder="—"
            {...register("stratum")}
          />
          <GlassInput label="Área construida (m²)" type="number" step="0.01" {...register("built_area_m2")} />
          <GlassInput label="Área privada (m²)" type="number" step="0.01" {...register("private_area_m2")} />
          <GlassInput label="Área del terreno (m²)" type="number" step="0.01" {...register("land_area_m2")} />
          <GlassInput label="Año de construcción" type="number" {...register("year_built")} />
        </div>
        <div className="mt-4">
          <GlassInput
            label="Características adicionales"
            placeholder="Piscina, Gimnasio, Terraza (separar con comas)"
            helperText="Separa cada característica con una coma"
            {...register("features")}
          />
        </div>
      </GlassCard>

      {/* Status */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Publicación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassSelect
            label="Disponibilidad"
            options={AVAILABILITY_OPTIONS}
            {...register("availability")}
          />
          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-accent-blue"
                {...register("is_published")}
              />
              <span className="text-sm text-text-secondary">Publicado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-accent-purple"
                {...register("is_featured")}
              />
              <span className="text-sm text-text-secondary">Destacado</span>
            </label>
          </div>
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <GlassButton
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancelar
        </GlassButton>
        <GlassButton type="submit" loading={loading}>
          {isEditing ? "Guardar cambios" : "Crear propiedad"}
        </GlassButton>
      </div>
    </form>
  );
}
