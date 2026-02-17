import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export async function GET() {
  const authResult = await getAuthContext();
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (error || !org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ organization: org });
}

export async function PUT(request: NextRequest) {
  const authResult = await getAuthContext({
    allowedRoles: ["super_admin", "org_admin"],
  });
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, organizationId } = authResult;

  const body = await request.json();

  const update: Record<string, unknown> = {};

  // Organization info
  if (body.name !== undefined) update.name = body.name;
  if (body.city !== undefined) update.city = body.city;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.email !== undefined) update.email = body.email;
  if (body.description_es !== undefined) update.description = body.description_es ? { es: body.description_es } : null;
  if (body.primary_color !== undefined) update.primary_color = body.primary_color;
  if (body.secondary_color !== undefined) update.secondary_color = body.secondary_color;
  if (body.logo_url !== undefined) update.logo_url = body.logo_url;
  if (body.favicon_url !== undefined) update.favicon_url = body.favicon_url;

  // AI Agent config
  if (body.agent_name !== undefined) update.agent_name = body.agent_name;
  if (body.agent_personality !== undefined) update.agent_personality = body.agent_personality;
  if (body.agent_welcome_message_es !== undefined) {
    update.agent_welcome_message = { es: body.agent_welcome_message_es };
  }
  if (body.agent_language !== undefined) update.agent_language = body.agent_language;

  // Onboarding
  if (body.onboarding_completed !== undefined) update.onboarding_completed = body.onboarding_completed;
  if (body.onboarding_step !== undefined) update.onboarding_step = body.onboarding_step;

  const { data, error } = await supabase
    .from("organizations")
    .update(update)
    .eq("id", organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organization: data });
}
