import { z } from "zod";

export const propertyFormSchema = z.object({
  title_es: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description_es: z.string().optional(),
  property_type: z.string().min(1, "Selecciona un tipo de inmueble"),
  business_type: z.string().min(1, "Selecciona un tipo de negocio"),
  property_status: z.string().optional(),
  availability: z.string().optional(),
  sale_price: z.coerce.number().min(0).optional(),
  rent_price: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  admin_fee: z.coerce.number().min(0).optional(),
  city: z.string().optional(),
  state_department: z.string().optional(),
  zone: z.string().optional(),
  address: z.string().optional(),
  locality: z.string().optional(),
  built_area_m2: z.coerce.number().min(0).optional(),
  private_area_m2: z.coerce.number().min(0).optional(),
  land_area_m2: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  parking_spots: z.coerce.number().int().min(0).optional(),
  stratum: z.coerce.number().int().min(1).max(6).optional(),
  year_built: z.coerce.number().int().min(1900).max(2100).optional(),
  features: z.string().optional(), // comma-separated, parsed on submit
  is_published: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  // Private fields
  private_notes: z.string().optional(),
  owner_name: z.string().optional(),
  owner_phone: z.string().optional(),
  owner_email: z.string().email("Email inválido").optional().or(z.literal("")),
  commission_value: z.coerce.number().min(0).max(100).optional(),
  commission_type: z.string().optional(),
});

// Use z.input for form input type (before coercion) — compatible with useForm + zodResolver
export type PropertyFormInput = z.input<typeof propertyFormSchema>;
// Use z.infer for validated output type (after coercion)
export type PropertyFormOutput = z.infer<typeof propertyFormSchema>;
