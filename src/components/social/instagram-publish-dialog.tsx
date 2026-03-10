"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { getI18nText, formatPrice, formatPropertyType, formatBusinessType } from "@/lib/utils/format";
import type { Property } from "@/lib/supabase/types";
import type { LateAccount } from "@/lib/social/types";

interface InstagramPublishDialogProps {
  property: Property;
  orgSlug: string;
  open: boolean;
  onClose: () => void;
}

type PublishState = "form" | "publishing" | "success" | "error";

/**
 * Generates a default Instagram caption from property data.
 */
function generateDefaultCaption(property: Property): string {
  const title = getI18nText(property.title);
  const type = formatPropertyType(property.property_type);
  const business = formatBusinessType(property.business_type);

  const parts: string[] = [];

  // Title
  if (title) parts.push(title);

  // Specs line
  const specs: string[] = [];
  if (property.bedrooms > 0) specs.push(`${property.bedrooms} hab`);
  if (property.bathrooms > 0) specs.push(`${property.bathrooms} ba\u00f1os`);
  if (property.built_area_m2) specs.push(`${property.built_area_m2}m\u00b2`);
  if (property.parking_spots && property.parking_spots > 0) specs.push(`${property.parking_spots} parq`);
  if (specs.length > 0) parts.push(specs.join(" \u00b7 "));

  // Price
  const price = property.sale_price > 0
    ? formatPrice(property.sale_price, property.currency || "COP")
    : property.rent_price > 0
      ? `${formatPrice(property.rent_price, property.currency || "COP")}/mes`
      : null;
  if (price) parts.push(price);

  // Location
  const location: string[] = [];
  if (property.zone) location.push(property.zone);
  if (property.city) location.push(property.city);
  if (location.length > 0) parts.push(`\ud83d\udccd ${location.join(", ")}`);

  // Hashtags
  const hashtags: string[] = ["#inmobiliaria"];
  if (property.city) hashtags.push(`#${property.city.toLowerCase().replace(/\s+/g, "")}`);
  hashtags.push(`#${type.toLowerCase().replace(/\s+/g, "")}`);
  if (business) hashtags.push(`#${business.toLowerCase().replace(/\s+/g, "")}`);
  hashtags.push("#propiedad", "#realestate");
  parts.push(hashtags.join(" "));

  return parts.join("\n\n");
}

export function InstagramPublishDialog({
  property,
  orgSlug: _orgSlug,
  open,
  onClose,
}: InstagramPublishDialogProps) {
  const [state, setState] = useState<PublishState>("form");
  const [accounts, setAccounts] = useState<LateAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [noConnection, setNoConnection] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [postUrl, setPostUrl] = useState("");

  const images = useMemo(
    () => (property.images as string[]) || [],
    [property.images]
  );

  // Load accounts + generate caption
  useEffect(() => {
    if (!open) return;

    // Reset state
    setState("form");
    setErrorMsg("");
    setPostUrl("");
    setCaption(generateDefaultCaption(property));

    // Select first 10 images by default
    const initialSelection = new Set<number>();
    images.forEach((_, i) => {
      if (i < 10) initialSelection.add(i);
    });
    setSelectedImages(initialSelection);

    // Fetch accounts
    setLoadingAccounts(true);
    fetch("/api/social/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.accounts?.length > 0) {
          setAccounts(data.accounts);
          setSelectedAccount(data.accounts[0].id);
          setNoConnection(false);
        } else {
          setNoConnection(true);
        }
      })
      .catch(() => setNoConnection(true))
      .finally(() => setLoadingAccounts(false));
  }, [open, property, images]);

  const toggleImage = useCallback((index: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < 10) {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handlePublish = async () => {
    if (selectedImages.size === 0) {
      setErrorMsg("Selecciona al menos una imagen.");
      return;
    }
    if (!caption.trim()) {
      setErrorMsg("Escribe un caption para el post.");
      return;
    }
    if (!selectedAccount) {
      setErrorMsg("Selecciona una cuenta de Instagram.");
      return;
    }

    setErrorMsg("");
    setState("publishing");

    const imageUrls = Array.from(selectedImages)
      .sort((a, b) => a - b)
      .map((i) => images[i]);

    console.log("[ig-publish] Starting publish:", {
      propertyId: property.id,
      accountId: selectedAccount,
      imageCount: imageUrls.length,
      firstImage: imageUrls[0]?.slice(0, 80),
    });

    try {
      const requestBody = {
        propertyId: property.id,
        accountId: selectedAccount,
        caption: caption.trim(),
        imageUrls,
      };

      console.log("[ig-publish] Sending request to /api/social/publish...");

      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("[ig-publish] Response received:", res.status, res.statusText);

      // Handle non-JSON responses (e.g. Vercel timeout, 502/504 errors)
      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        console.error("[ig-publish] Non-JSON response:", res.status, text.slice(0, 200));
        if (res.status === 504 || res.status === 502) {
          setErrorMsg("La publicación tardó demasiado. Puede que se haya publicado — verifica en Instagram.");
        } else {
          setErrorMsg(`Error del servidor (${res.status}). ${text.slice(0, 100)}`);
        }
        setState("error");
        return;
      }

      console.log("[ig-publish] Response data:", data);

      if (!res.ok) {
        setErrorMsg(data.error || `Error al publicar (${res.status}).`);
        setState("error");
        return;
      }

      setPostUrl(data.postUrl || "");
      setState("success");
    } catch (err) {
      // Log full error details for debugging
      console.error("[ig-publish] Fetch error:", err);
      console.error("[ig-publish] Error type:", typeof err, err?.constructor?.name);

      let detail = "sin detalles";
      if (err instanceof Error) {
        detail = `${err.name}: ${err.message}`;
      } else if (typeof err === "string") {
        detail = err;
      } else {
        try { detail = JSON.stringify(err); } catch { detail = String(err); }
      }
      setErrorMsg(`Error de red: ${detail}`);
      setState("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <GlassCard className="!bg-bg-surface">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary">
                Publicar en Instagram
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-muted hover:text-text-primary"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading */}
          {loadingAccounts && (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-accent-blue" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {/* No connection */}
          {!loadingAccounts && noConnection && (
            <div className="text-center py-6">
              <p className="text-sm text-text-secondary mb-3">
                No hay cuenta de Instagram conectada.
              </p>
              <p className="text-xs text-text-muted">
                Ve a{" "}
                <span className="text-accent-blue">Configuraci\u00f3n &rarr; Redes Sociales</span>{" "}
                para conectar tu cuenta de Late.
              </p>
            </div>
          )}

          {/* Form state */}
          {!loadingAccounts && !noConnection && state === "form" && (
            <div className="space-y-4">
              {/* Image selector */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Selecciona las fotos ({selectedImages.size} de {Math.min(images.length, 10)})
                </label>
                {images.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    Esta propiedad no tiene im\u00e1genes.
                  </p>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {images.slice(0, 10).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => toggleImage(i)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImages.has(i)
                            ? "border-accent-blue ring-2 ring-accent-blue/30"
                            : "border-border-glass hover:border-border-glass-hover"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {selectedImages.has(i) && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent-blue flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  maxLength={2200}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent transition-all resize-none text-sm"
                  placeholder="Escribe el caption del post..."
                />
                <p className="text-[11px] text-text-muted mt-1 text-right">
                  {caption.length}/2200
                </p>
              </div>

              {/* Account selector */}
              {accounts.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Cuenta
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all text-sm"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        @{a.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {accounts.length === 1 && (
                <p className="text-xs text-text-muted">
                  Cuenta: <span className="text-text-primary font-medium">@{accounts[0].username}</span>
                </p>
              )}

              {/* Error */}
              {errorMsg && (
                <p className="text-xs text-accent-red">{errorMsg}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePublish}
                  disabled={selectedImages.size === 0 || !caption.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-pink to-accent-purple text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                  </svg>
                  Publicar ahora
                </button>
              </div>
            </div>
          )}

          {/* Publishing state */}
          {state === "publishing" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <svg className="w-8 h-8 animate-spin text-accent-pink" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">
                  Publicando en Instagram...
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Subiendo {selectedImages.size} im\u00e1genes y creando el carrusel.
                </p>
              </div>
            </div>
          )}

          {/* Success state */}
          {state === "success" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">
                  Publicado exitosamente
                </p>
                {postUrl && (
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-blue hover:underline mt-2 inline-block"
                  >
                    Ver post en Instagram &rarr;
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-red/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">
                  Error al publicar
                </p>
                <p className="text-xs text-accent-red mt-1">
                  {errorMsg}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setState("form");
                    setErrorMsg("");
                  }}
                  className="px-4 py-2 rounded-xl text-sm text-accent-blue hover:bg-accent-blue/10 transition-all"
                >
                  Intentar de nuevo
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
