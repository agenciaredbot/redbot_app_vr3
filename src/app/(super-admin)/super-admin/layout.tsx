import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SuperAdminSidebar } from "@/components/layout/super-admin-sidebar";
import { SuperAdminHeader } from "@/components/layout/super-admin-header";
import { GradientBackground } from "@/components/ui/gradient-background";

export default async function SuperAdminLayout({
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

  // Only super_admin can access this panel
  if (profile.role !== "super_admin") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen">
      <GradientBackground />
      <SuperAdminSidebar />
      <div className="ml-64">
        <SuperAdminHeader
          userName={profile.full_name}
          userEmail={profile.email}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
