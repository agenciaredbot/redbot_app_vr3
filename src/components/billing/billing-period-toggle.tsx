"use client";

import type { BillingPeriod } from "@/lib/billing/types";

interface BillingPeriodToggleProps {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}

export function BillingPeriodToggle({
  value,
  onChange,
}: BillingPeriodToggleProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={`text-sm transition-colors ${
          value === "monthly"
            ? "text-text-primary font-medium"
            : "text-text-muted"
        }`}
      >
        Mensual
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value === "annual"}
        onClick={() =>
          onChange(value === "monthly" ? "annual" : "monthly")
        }
        className="relative w-12 h-6 rounded-full transition-colors bg-white/[0.08] border border-border-glass hover:border-border-glass-hover"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
            value === "annual"
              ? "translate-x-6 bg-accent-blue"
              : "translate-x-0 bg-text-muted"
          }`}
        />
      </button>
      <span
        className={`text-sm transition-colors ${
          value === "annual"
            ? "text-text-primary font-medium"
            : "text-text-muted"
        }`}
      >
        Anual
      </span>
      {value === "annual" && (
        <span className="ml-1 text-xs font-medium text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full">
          1 mes gratis
        </span>
      )}
    </div>
  );
}
