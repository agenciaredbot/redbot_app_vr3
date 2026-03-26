import { z } from "zod";

export const affiliateRegisterSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
  payoutMethod: z.enum(["nequi", "bank_transfer", "other"]).optional(),
  payoutDetails: z.record(z.string(), z.string()).optional(),
});

export const affiliateActivateSchema = z.object({
  payoutMethod: z.enum(["nequi", "bank_transfer", "other"]).optional(),
  payoutDetails: z.record(z.string(), z.string()).optional(),
});

export const affiliateProfileUpdateSchema = z.object({
  phone: z.string().optional(),
  payoutMethod: z.enum(["nequi", "bank_transfer", "other"]).optional(),
  payoutDetails: z.record(z.string(), z.string()).optional(),
});

export const commissionRateUpdateSchema = z.object({
  rates: z.array(
    z.object({
      plan_tier: z.enum(["lite", "basic", "power", "omni"]),
      commission_percent: z.number().min(0).max(100),
    })
  ),
});

export const payoutCreateSchema = z.object({
  affiliate_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  payout_method: z.enum(["nequi", "bank_transfer", "other"]),
  payout_details: z.record(z.string(), z.string()).optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});
