"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";

interface Props {
  referralLink: string;
  referralCode: string;
}

export function AffiliateReferralLink({ referralLink, referralCode }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-border-glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Tu Link de Referido</h3>
          <p className="text-xs text-text-muted">
            Comparte este link. Código: <span className="font-mono text-accent-blue">{referralCode}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-secondary text-sm font-mono truncate">
          {referralLink}
        </div>
        <GlassButton onClick={handleCopy} variant={copied ? "secondary" : "primary"}>
          {copied ? "Copiado" : "Copiar"}
        </GlassButton>
      </div>
    </div>
  );
}
