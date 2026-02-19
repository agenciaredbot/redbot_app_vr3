import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema } from "@/lib/validators/auth";
import { generateSlug } from "@/lib/utils/slug";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email, password, organizationName } = parsed.data;

    // Use anon client for signUp — this triggers the confirmation email via SMTP
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: signUpData, error: signUpError } =
      await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization_name: organizationName,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://redbot.app"}/api/auth/callback?type=signup`,
        },
      });

    if (signUpError || !signUpData.user) {
      return NextResponse.json(
        { error: signUpError?.message || "Error al crear usuario" },
        { status: 400 }
      );
    }

    // Use admin client for org + profile creation (bypasses RLS)
    const supabase = createAdminClient();

    // Generate slug from org name
    let slug = generateSlug(organizationName);

    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingOrg) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName,
        slug,
        email,
      })
      .select()
      .single();

    if (orgError || !org) {
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return NextResponse.json(
        { error: "Error al crear organización" },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: signUpData.user.id,
        organization_id: org.id,
        role: "org_admin",
        full_name: fullName,
        email,
      });

    if (profileError) {
      await supabase.from("organizations").delete().eq("id", org.id);
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return NextResponse.json(
        { error: "Error al crear perfil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: { id: signUpData.user.id, email },
      organization: { id: org.id, slug: org.slug, name: org.name },
      needsEmailConfirmation: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
