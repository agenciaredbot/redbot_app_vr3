"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ImpersonationBannerProps {
  orgName: string;
}

export function ImpersonationBanner({ orgName }: ImpersonationBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExit = async () => {
    setLoading(true);
    try {
      await fetch("/api/super-admin/impersonate", { method: "DELETE" });
      router.push("/super-admin/organizations");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-accent-orange/15 backdrop-blur-xl border-b border-accent-orange/30">
      <div className="flex items-center justify-center gap-3 h-10 px-4">
        {/* Shield icon */}
        <svg
          className="w-4 h-4 text-accent-orange shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>

        <span className="text-sm font-medium text-accent-orange">
          Gestionando: <strong>{orgName}</strong> como Super Admin
        </span>

        <button
          onClick={handleExit}
          disabled={loading}
          className="ml-2 px-3 py-1 text-xs font-medium rounded-md bg-accent-orange/20 text-accent-orange border border-accent-orange/30 hover:bg-accent-orange/30 transition-colors disabled:opacity-50"
        >
          {loading ? "Saliendo..." : "Salir"}
        </button>
      </div>
    </div>
  );
}
