"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";

interface Stats {
  sent: { pending: number; approved: number; total: number };
  received: { pending: number; approved: number; total: number };
  activeRequests: number;
  trustedPartners: number;
}

export function OpportunityStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/opportunities/stats")
      .then((res) => res.json())
      .then((data) => setStats(data.stats))
      .catch(console.error);
  }, []);

  if (!stats) return null;

  const cards = [
    {
      label: "Enviadas Pendientes",
      value: stats.sent.pending,
      color: "#F59E0B",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      ),
    },
    {
      label: "Compartidas Activas",
      value: stats.sent.approved + stats.received.approved,
      color: "#10B981",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
    },
    {
      label: "Recibidas Pendientes",
      value: stats.received.pending,
      color: "#3B82F6",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
        </svg>
      ),
    },
    {
      label: "Solicitudes Activas",
      value: stats.activeRequests,
      color: "#8B5CF6",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <GlassCard key={card.label} padding="md">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${card.color}15`, color: card.color }}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{card.value}</p>
              <p className="text-xs text-text-muted">{card.label}</p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
