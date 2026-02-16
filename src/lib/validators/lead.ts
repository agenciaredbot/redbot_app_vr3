import { z } from "zod";

export const leadUpdateSchema = z.object({
  pipeline_stage: z.string().optional(),
  notes: z.string().optional(),
  full_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  temperature: z.string().optional(),
});

export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;
