import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { GradientBackground } from "@/components/ui/gradient-background";

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug")
    .eq("id", profile.organization_id)
    .single();

  // Guard: if user is on a tenant subdomain that doesn't match their org,
  // redirect them to their correct subdomain admin panel.
  const headersList = await headers();
  const subdomainSlug = headersList.get("x-organization-slug");

  if (subdomainSlug && org?.slug && subdomainSlug !== org.slug) {
    redirect(`https://${org.slug}.${rootDomain}/admin`);
  }

  return (
    <div className="min-h-screen">
      <GradientBackground />
      <AdminSidebar orgName={org?.name || "Mi Empresa"} />
      <div className="ml-64">
        <AdminHeader
          userName={profile.full_name}
          userEmail={profile.email}
          isSuperAdmin={profile.role === "super_admin"}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
