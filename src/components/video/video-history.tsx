"use client";

import { useState, useEffect } from "react";
import type { VideoProject } from "@/lib/video/types";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-accent-orange/10 text-accent-orange border-accent-orange/20" },
  rendering: { label: "Creando...", color: "bg-accent-blue/10 text-accent-blue border-accent-blue/20" },
  completed: { label: "Listo", color: "bg-accent-green/10 text-accent-green border-accent-green/20" },
  failed: { label: "Error", color: "bg-accent-red/10 text-accent-red border-accent-red/20" },
};

const WORKFLOW_LABELS: Record<string, string> = {
  "script-to-video": "Vitrina",
  "ad-generator": "Anuncio",
  "prompt-to-video": "Libre",
};

interface VideoHistoryProps {
  propertyId: string;
}

export function VideoHistory({ propertyId }: VideoHistoryProps) {
  const [videos, setVideos] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/video/list?propertyId=${propertyId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setVideos(data.videos || []);
        }
      } catch {
        // Silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [propertyId]);

  if (loading) return null;
  if (videos.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
        Videos creados ({videos.length})
      </p>
      {videos.map((v) => {
        const statusInfo = STATUS_LABELS[v.revid_status] || STATUS_LABELS.pending;
        const date = new Date(v.created_at).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
        });

        return (
          <div
            key={v.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-border-glass"
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">
                  {WORKFLOW_LABELS[v.workflow] || v.workflow}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">{date}</p>
            </div>

            {/* Action */}
            {v.revid_status === "completed" && v.revid_video_url && (
              <a
                href={v.revid_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-accent-blue hover:underline flex-shrink-0"
              >
                Ver video
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
