"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface GlassSidebarProps {
  items: SidebarItem[];
  header?: ReactNode;
  footer?: ReactNode;
}

export function GlassSidebar({ items, header, footer }: GlassSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-bg-glass backdrop-blur-xl border-r border-border-glass flex flex-col z-40">
      {/* Header */}
      {header && (
        <div className="p-4 border-b border-border-glass">{header}</div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? "bg-accent-blue/10 text-accent-blue border-l-2 border-accent-blue"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
                }
              `}
            >
              <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-accent-blue text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-border-glass">{footer}</div>
      )}
    </aside>
  );
}
