import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  bgClass: string;
  textClass: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon, bgClass, textClass, subtitle }: StatCardProps) {
  return (
    <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">{label}</p>
          <p className={`text-3xl font-bold ${textClass}`}>
            {typeof value === "number" ? value.toLocaleString("es-CO") : value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center flex-shrink-0`}>
          <span className={`w-5 h-5 ${textClass}`}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
