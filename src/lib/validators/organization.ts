import { z } from "zod";

export const organizationCreateSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z
    .string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .max(63, "El slug no puede tener más de 63 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  city: z.string().optional(),
  email: z.string().email("Correo electrónico inválido").optional(),
  phone: z.string().optional(),
});

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;

export const organizationUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.object({ es: z.string() }).optional(),
  logo_url: z.string().url().optional().nullable(),
  logo_light_url: z.string().url().optional().nullable(),
  theme_mode: z.enum(["dark", "light"]).optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().nullable(),
  agent_name: z.string().optional(),
  agent_personality: z.string().optional().nullable(),
  agent_welcome_message: z.object({ es: z.string() }).optional(),
  agent_language: z.enum(["es", "en"]).optional(),
});

export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
