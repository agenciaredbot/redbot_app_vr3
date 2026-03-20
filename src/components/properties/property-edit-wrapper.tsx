"use client";

import { useState, useCallback, useRef } from "react";
import { PropertyForm } from "./property-form";
import { ImageUpload } from "./image-upload";
import { PropertyPortals } from "@/components/portals/property-portals";
import { InstagramPublishDialog } from "@/components/social/instagram-publish-dialog";
import { VideoCreateDialog } from "@/components/video/video-create-dialog";
import { VideoHistory } from "@/components/video/video-history";
import { GlassCard } from "@/components/ui/glass-card";
import { getI18nText } from "@/lib/utils/format";
import type { Property } from "@/lib/supabase/types";

interface PropertyEditWrapperProps {
  property: Property;
  orgSlug: string;
}

function CopyButton({ url, label }: { url: string; label: string }) {
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
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-glass border border-border-glass min-w-0">
        <span className="text-xs font-medium text-text-muted flex-shrink-0">{label}</span>
        <span className="text-sm font-mono text-text-primary truncate">{url}</span>
      </div>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
          copied
            ? "bg-accent-green/10 text-accent-green border border-accent-green/30"
            : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/20"
        }`}
      >
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Copiado
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar
          </>
        )}
      </button>
    </div>
  );
}

export function PropertyEditWrapper({ property, orgSlug }: PropertyEditWrapperProps) {
  const [images, setImages] = useState<string[]>(
    (property.images as string[]) || []
  );
  const [igDialogOpen, setIgDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  const title = getI18nText(property.title);
  const propertySlug = property.slug;
  const isPublished = property.is_published;
  const hasSlug = orgSlug && propertySlug;

  const normalUrl = hasSlug ? `https://${orgSlug}.redbot.app/propiedades/${propertySlug}` : "";
  const genericUrl = hasSlug ? `https://${orgSlug}.redbot.app/propiedades/${propertySlug}?embed=1` : "";

  return (
    <div className="space-y-6">
      {/* Property links */}
      {hasSlug && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">
              Links de la propiedad
            </h3>
            {!isPublished && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/20">
                No publicada — links solo funcionan cuando esté publicada
              </span>
            )}
          </div>

          <div className="space-y-2">
            <CopyButton url={normalUrl} label="Normal" />
            <CopyButton url={genericUrl} label="Genérico" />
          </div>

          <p className="text-[11px] text-text-muted mt-2">
            <strong>Normal:</strong> incluye tu marca (logo, navbar). &nbsp;
            <strong>Genérico:</strong> sin branding, ideal para compartir sin identificar la inmobiliaria.
          </p>
        </GlassCard>
      )}

      <PropertyForm property={property} />
      <ImageUpload
        propertyId={property.id}
        images={images}
        onImagesChange={setImages}
      />
      <PropertyPortals propertyId={property.id} />

      {/* Instagram publishing */}
      {isPublished && images.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <h3 className="text-sm font-semibold text-text-primary">
                Instagram
              </h3>
            </div>
            <button
              onClick={() => setIgDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-pink/10 to-accent-purple/10 text-accent-pink border border-accent-pink/20 hover:from-accent-pink/20 hover:to-accent-purple/20 text-sm font-medium transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
              </svg>
              Publicar en Instagram
            </button>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Publica esta propiedad como un carrusel de fotos en tu cuenta de Instagram.
          </p>
        </GlassCard>
      )}

      {/* Video creation — Omni plan */}
      {isPublished && images.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <h3 className="text-sm font-semibold text-text-primary">
                Videos Marketing
              </h3>
            </div>
            <button
              onClick={() => setVideoDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 text-accent-purple border border-accent-purple/20 hover:from-accent-purple/20 hover:to-accent-blue/20 text-sm font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Crear Video
            </button>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Crea videos de marketing con IA para esta propiedad. Requiere plan Omni.
          </p>
          <VideoHistory propertyId={property.id} />
        </GlassCard>
      )}

      <InstagramPublishDialog
        property={property}
        orgSlug={orgSlug}
        open={igDialogOpen}
        onClose={() => setIgDialogOpen(false)}
      />
      <VideoCreateDialog
        property={property}
        orgSlug={orgSlug}
        open={videoDialogOpen}
        onClose={() => setVideoDialogOpen(false)}
      />
    </div>
  );
}
