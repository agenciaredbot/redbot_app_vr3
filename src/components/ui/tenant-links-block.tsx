"use client";

import { useState, useCallback, useRef } from "react";

interface LinkItem {
  label: string;
  url: string;
  description: string;
  icon: React.ReactNode;
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
        copied
          ? "bg-accent-green/10 text-accent-green border border-accent-green/30"
          : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/20"
      }`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

const LinkIcon = () => (
  <svg className="w-4 h-4 text-accent-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const LoginIcon = () => (
  <svg className="w-4 h-4 text-accent-purple flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

const AdminIcon = () => (
  <svg className="w-4 h-4 text-accent-cyan flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
  </svg>
);

export function TenantLinksBlock({ slug }: { slug: string }) {
  const baseUrl = `https://${slug}.redbot.app`;

  const links: LinkItem[] = [
    {
      label: "Landing para clientes",
      url: baseUrl,
      description: "Comparte con tus clientes o en redes sociales",
      icon: <LinkIcon />,
    },
    {
      label: "Login para tu equipo",
      url: `${baseUrl}/login`,
      description: "Compártelo con tu equipo para que accedan",
      icon: <LoginIcon />,
    },
    {
      label: "Panel de administración",
      url: `${baseUrl}/admin`,
      description: "Tu panel de gestión (requiere sesión iniciada)",
      icon: <AdminIcon />,
    },
  ];

  return (
    <div className="space-y-2.5">
      {links.map((link) => (
        <div
          key={link.label}
          className="p-3 rounded-xl bg-white/[0.03] border border-border-glass"
        >
          <div className="flex items-center gap-2 mb-1">
            {link.icon}
            <span className="text-xs font-medium text-text-secondary">
              {link.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-mono text-text-primary truncate">
              {link.url}
            </span>
            <CopyButton url={link.url} />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            {link.description}
          </p>
        </div>
      ))}
    </div>
  );
}
