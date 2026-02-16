import { type ReactNode } from "react";

interface GlassBadgeProps {
  children: ReactNode;
  color?: string;
  size?: "sm" | "md";
  className?: string;
}

export function GlassBadge({
  children,
  color,
  size = "sm",
  className = "",
}: GlassBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses}
        ${className}
      `}
      style={
        color
          ? {
              backgroundColor: `${color}20`,
              color: color,
              borderColor: `${color}40`,
              borderWidth: "1px",
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
