"use client";

import { type ReactNode, useState } from "react";

interface GlassNavbarProps {
  logo?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

export function GlassNavbar({ logo, children, actions }: GlassNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-bg-glass/80 backdrop-blur-xl border-b border-border-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          {logo && <div className="flex-shrink-0">{logo}</div>}

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">{children}</nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">{actions}</div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border-glass bg-bg-glass/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-2">{children}</div>
          <div className="px-4 py-3 border-t border-border-glass space-y-2">
            {actions}
          </div>
        </div>
      )}
    </header>
  );
}

export function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`
        px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${active ? "text-text-primary bg-white/[0.05]" : "text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"}
      `}
    >
      {children}
    </a>
  );
}
