"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AdminHeaderProps {
  userName: string;
  userEmail: string;
}

export function AdminHeader({ userName, userEmail }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-bg-glass/80 backdrop-blur-xl border-b border-border-glass">
      <div className="flex items-center justify-between h-14 px-6">
        <div />

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-text-primary">{userName}</p>
            <p className="text-xs text-text-muted">{userEmail}</p>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors"
            title="Cerrar sesión"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
