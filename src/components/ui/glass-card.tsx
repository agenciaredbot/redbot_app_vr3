import { type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "hover" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantMap = {
  default: "",
  hover: "hover:bg-bg-glass-hover hover:border-border-glass-hover hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)]",
  interactive: "hover:bg-bg-glass-hover hover:border-border-glass-hover hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] cursor-pointer active:scale-[0.99]",
};

export function GlassCard({
  children,
  className = "",
  variant = "default",
  padding = "md",
}: GlassCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden
        bg-bg-glass backdrop-blur-xl
        border border-border-glass
        rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        transition-all duration-300
        ${variantMap[variant]}
        ${paddingMap[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
