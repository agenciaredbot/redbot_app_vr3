import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { GradientBackground } from "@/components/ui/gradient-background";

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
    .select("name")
    .eq("id", profile.organization_id)
    .single();

  return (
    <div className="min-h-screen">
      <GradientBackground />
      <AdminSidebar orgName={org?.name || "Mi Empresa"} />
      <div className="ml-64">
        <AdminHeader
          userName={profile.full_name}
          userEmail={profile.email}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
