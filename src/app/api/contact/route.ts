import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewLeadNotification } from "@/lib/email/send-new-lead-notification";
import { z } from "zod";

const contactFormSchema = z.object({
  organizationSlug: z.string().min(1),
  fullName: z.string().min(1, "El nombre es requerido").max(200),
  email: z.string().email("Email inválido"),
  phone: z.string().max(30).optional().default(""),
  message: z.string().min(1, "El mensaje es requerido").max(2000),
  propertyId: z.string().uuid().optional(),
  /** Honeypot field — must be empty for legitimate submissions */
  website: z.string().max(0, "").optional().default(""),
});

/**
 * Public contact form endpoint for Lite plan tenant pages.
 * Creates a lead without requiring auth (similar to chat API).
 */
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.values(flat.fieldErrors)[0];
    const msg = (firstFieldError && firstFieldError[0]) || "Datos inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const input = parsed.data;

  // Honeypot check
  if (input.website) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const supabase = createAdminClient();

  // Resolve org by slug
  const { data: org } = await supabase
    .from("organizations")
    .select("id, plan_status")
    .eq("slug", input.organizationSlug)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  if (!["active", "trialing"].includes(org.plan_status)) {
    return NextResponse.json({ error: "Organización no activa" }, { status: 403 });
  }

  // Create lead
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: org.id,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone || null,
      notes: input.message,
      source: "contact_form",
      pipeline_stage: "nuevo",
      property_summary: input.propertyId ? `Interesado en propiedad ${input.propertyId}` : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Error al guardar el contacto" }, { status: 500 });
  }

  // Send email notification to org admins
  await sendNewLeadNotification(org.id, lead);

  return NextResponse.json({ success: true }, { status: 201 });
}
