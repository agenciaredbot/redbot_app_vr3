"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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

const WhatsAppIcon = () => (
  <svg className="w-4 h-4 text-[#25D366] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function TenantLinksBlock({ slug }: { slug: string }) {
  const baseUrl = `https://${slug}.redbot.app`;
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/whatsapp/instance")
      .then((res) => res.json())
      .then((data) => {
        if (data.instance?.connection_status === "connected" && data.instance?.connected_phone) {
          setWhatsappPhone(data.instance.connected_phone.replace(/\D/g, ""));
        }
      })
      .catch(() => {});
  }, []);

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
    ...(whatsappPhone
      ? [
          {
            label: "WhatsApp del agente AI",
            url: `https://wa.me/${whatsappPhone}`,
            description: "Comparte con tus clientes para que hablen con tu agente AI por WhatsApp",
            icon: <WhatsAppIcon />,
          },
        ]
      : []),
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
