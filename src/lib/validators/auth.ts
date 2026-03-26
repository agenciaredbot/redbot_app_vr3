import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Nombre muy largo")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-'.]+$/,
      "El nombre solo puede contener letras, espacios y guiones"
    ),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  organizationName: z
    .string()
    .min(3, "El nombre de la empresa debe tener al menos 3 caracteres")
    .max(100, "Nombre de empresa muy largo")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-&.,']+$/,
      "El nombre contiene caracteres no permitidos"
    ),
  planTier: z.enum(["lite", "basic", "power", "omni"]).optional().default("basic"),
  intent: z.enum(["buy", "trial"]).optional().default("trial"),
  /** Honeypot field — must be empty for legitimate submissions */
  website: z.string().max(0, "").optional().default(""),
});

export type RegisterInput = z.input<typeof registerSchema>;

export const joinSchema = z.object({
  token: z.string().uuid("Token de invitación inválido"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type JoinInput = z.infer<typeof joinSchema>;
