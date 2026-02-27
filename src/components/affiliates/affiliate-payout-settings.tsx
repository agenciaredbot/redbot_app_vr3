"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import type { AffiliateProfile } from "@/lib/affiliates/types";

interface Props {
  affiliate: AffiliateProfile;
  onSave: () => void;
}

export function AffiliatePayoutSettings({ affiliate, onSave }: Props) {
  const [payoutMethod, setPayoutMethod] = useState<string>(affiliate.payout_method || "nequi");
  const [phone, setPhone] = useState(affiliate.phone || "");
  const [bankName, setBankName] = useState(
    (affiliate.payout_details as Record<string, string>)?.bank_name || ""
  );
  const [accountNumber, setAccountNumber] = useState(
    (affiliate.payout_details as Record<string, string>)?.account_number || ""
  );
  const [accountType, setAccountType] = useState(
    (affiliate.payout_details as Record<string, string>)?.account_type || "ahorros"
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payoutDetails: Record<string, string> = {};
      if (payoutMethod === "nequi") {
        payoutDetails.nequi_phone = phone;
      } else if (payoutMethod === "bank_transfer") {
        payoutDetails.bank_name = bankName;
        payoutDetails.account_number = accountNumber;
        payoutDetails.account_type = accountType;
      }

      const res = await fetch("/api/affiliates/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          payoutMethod,
          payoutDetails,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      setMessage("Configuración guardada exitosamente");
      onSave();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">Método de Pago</h3>
        <p className="text-xs text-text-muted">Configura cómo quieres recibir tus comisiones</p>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">Método preferido</label>
        <select
          value={payoutMethod}
          onChange={(e) => setPayoutMethod(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="nequi">Nequi</option>
          <option value="bank_transfer">Transferencia bancaria</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">Teléfono de contacto</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="3001234567"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        />
      </div>

      {payoutMethod === "nequi" && (
        <p className="text-xs text-text-muted">
          Usaremos tu número de teléfono para enviarte los pagos por Nequi.
        </p>
      )}

      {payoutMethod === "bank_transfer" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Banco</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bancolombia, Davivienda, etc."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">Número de cuenta</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="000-000000-00"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">Tipo de cuenta</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            >
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.includes("Error") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}

      <GlassButton onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar Configuración"}
      </GlassButton>
    </div>
  );
}
