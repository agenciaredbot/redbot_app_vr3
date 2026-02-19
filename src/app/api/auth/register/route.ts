import { NextRequest, NextResponse } from "next/server";
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
    const supabase = createAdminClient();

    // Generate slug from org name
    let slug = generateSlug(organizationName);

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingOrg) {
      // Append random suffix
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Create auth user (email_confirm: false → sends confirmation email)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          organization_name: organizationName,
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Error al crear usuario" },
        { status: 400 }
      );
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
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Error al crear organización" },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authData.user.id,
        organization_id: org.id,
        role: "org_admin",
        full_name: fullName,
        email,
      });

    if (profileError) {
      // Rollback
      await supabase.from("organizations").delete().eq("id", org.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Error al crear perfil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: { id: authData.user.id, email },
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
