import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variantClasses = {
  primary:
    "bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:opacity-90",
  secondary:
    "bg-bg-glass border border-border-glass text-text-primary hover:bg-bg-glass-hover hover:border-border-glass-hover",
  ghost:
    "bg-transparent text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
  danger:
    "bg-accent-red/10 border border-accent-red/20 text-accent-red hover:bg-accent-red/20",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function GlassButton({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
