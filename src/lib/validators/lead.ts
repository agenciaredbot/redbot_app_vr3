import { z } from "zod";

export const leadCreateSchema = z.object({
  full_name: z.string().min(2, "El nombre es obligatorio (mínimo 2 caracteres)"),
  email: z.string().email("Email no válido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  pipeline_stage: z.string().optional().default("nuevo"),
  source: z.string().optional().default("manual"),
  budget: z.coerce.number().positive("El presupuesto debe ser mayor a 0").optional().or(z.literal("")),
  property_summary: z.string().optional().or(z.literal("")),
  preferred_zones: z.string().optional().or(z.literal("")),
  timeline: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type LeadCreateInput = z.input<typeof leadCreateSchema>;

export const leadUpdateSchema = z.object({
  pipeline_stage: z.string().optional(),
  notes: z.string().optional(),
  full_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  temperature: z.string().optional(),
  budget: z.coerce.number().optional().nullable(),
  property_summary: z.string().optional().nullable(),
  preferred_zones: z.string().optional().nullable(),
  timeline: z.string().optional().nullable(),
});

export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;
