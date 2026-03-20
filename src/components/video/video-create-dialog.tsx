"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Property } from "@/lib/supabase/types";
import type { RevidWorkflow } from "@/lib/video/types";
import { VIDEO_PRESETS } from "@/lib/video/types";
import { generatePropertyScript } from "@/lib/video/script-generator";

type DialogState = "form" | "rendering" | "polling" | "success" | "error";

interface VideoCreateDialogProps {
  property: Property;
  orgSlug: string;
  open: boolean;
  onClose: () => void;
}

export function VideoCreateDialog({
  property,
  open,
  onClose,
}: VideoCreateDialogProps) {
  // Form state
  const [preset, setPreset] = useState<string>("showcase");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [script, setScript] = useState("");
  const [enableVoice, setEnableVoice] = useState(true);
  const [enableCaptions, setEnableCaptions] = useState(true);
  const [aspectRatio, setAspectRatio] = useState("9 / 16");

  // Dialog state
  const [dialogState, setDialogState] = useState<DialogState>("form");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoProjectId, setVideoProjectId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const images = (property.images as string[]) || [];

  // Initialize form on open
  useEffect(() => {
    if (open) {
      setDialogState("form");
      setVideoUrl(null);
      setErrorMessage("");
      setVideoProjectId(null);
      setPreset("showcase");
      setSelectedImages(images.slice(0, 10));
      setScript(generatePropertyScript(property));
      setEnableVoice(true);
      setEnableCaptions(true);
      setAspectRatio("9 / 16");
      pollCountRef.current = 0;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle image selection
  const toggleImage = useCallback((url: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 10) return prev;
      return [...prev, url];
    });
  }, []);

  // Get workflow from preset
  const getWorkflow = (): RevidWorkflow => {
    const p = VIDEO_PRESETS.find((vp) => vp.id === preset);
    return p?.workflow || "script-to-video";
  };

  // Poll for status
  const startPolling = useCallback((vpId: string) => {
    setDialogState("polling");
    pollCountRef.current = 0;

    pollRef.current = setInterval(async () => {
      pollCountRef.current++;

      if (pollCountRef.current > 60) {
        // 5 min timeout
        if (pollRef.current) clearInterval(pollRef.current);
        setDialogState("error");
        setErrorMessage(
          "El video est\u00e1 tardando m\u00e1s de lo esperado. Puedes verificar en unos minutos."
        );
        return;
      }

      try {
        const res = await fetch(
          `/api/video/status?videoProjectId=${vpId}`
        );
        const data = await res.json();

        if (data.status === "completed" && data.videoUrl) {
          if (pollRef.current) clearInterval(pollRef.current);
          setVideoUrl(data.videoUrl);
          setDialogState("success");
        } else if (data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setErrorMessage(data.error || "Error al crear el video.");
          setDialogState("error");
        }
      } catch {
        // Continue polling on network errors
      }
    }, 5000);
  }, []);

  // Handle render
  const handleRender = async () => {
    setDialogState("rendering");
    setErrorMessage("");

    try {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          workflow: getWorkflow(),
          script,
          imageUrls: selectedImages,
          aspectRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Error al iniciar el video.");
        setDialogState("error");
        return;
      }

      setVideoProjectId(data.videoProjectId);
      startPolling(data.videoProjectId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error de conexi\u00f3n"
      );
      setDialogState("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dialogState === "form" ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border-glass bg-bg-glass/80 backdrop-blur-xl rounded-t-2xl">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-accent-purple"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <h2 className="text-base font-semibold text-text-primary">
              Crear Video
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-text-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* ── FORM STATE ── */}
          {dialogState === "form" && (
            <div className="space-y-6">
              {/* Preset selection */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-3 block">
                  Tipo de video
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {VIDEO_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        preset === p.id
                          ? "border-accent-purple bg-accent-purple/10"
                          : "border-border-glass hover:border-border-glass-hover hover:bg-bg-glass-hover"
                      }`}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <p className="text-sm font-medium text-text-primary mt-1">
                        {p.label}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">
                        {p.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image selector (not for prompt-to-video) */}
              {getWorkflow() !== "prompt-to-video" && images.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-text-primary mb-2 block">
                    Fotos ({selectedImages.length}/10)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {images.map((img) => (
                      <button
                        key={img}
                        onClick={() => toggleImage(img)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImages.includes(img)
                            ? "border-accent-purple ring-1 ring-accent-purple/50"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {selectedImages.includes(img) && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Script */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  {getWorkflow() === "prompt-to-video" ? "Prompt" : "Gui\u00f3n"}
                </label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-bg-glass border border-border-glass text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/50 resize-none"
                  placeholder={
                    getWorkflow() === "prompt-to-video"
                      ? "Describe el video que quieres crear..."
                      : "El gui\u00f3n para tu video..."
                  }
                />
              </div>

              {/* Options row */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableVoice}
                    onChange={(e) => setEnableVoice(e.target.checked)}
                    className="rounded border-border-glass"
                  />
                  Narración de voz
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCaptions}
                    onChange={(e) => setEnableCaptions(e.target.checked)}
                    className="rounded border-border-glass"
                  />
                  Subtítulos
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-bg-glass border border-border-glass text-sm text-text-primary"
                >
                  <option value="9 / 16">Vertical (9:16)</option>
                  <option value="16 / 9">Horizontal (16:9)</option>
                </select>
              </div>

              {/* Render button */}
              <button
                onClick={handleRender}
                disabled={!script.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Crear Video
              </button>
            </div>
          )}

          {/* ── RENDERING / POLLING STATE ── */}
          {(dialogState === "rendering" || dialogState === "polling") && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="w-16 h-16 border-4 border-accent-purple/20 border-t-accent-purple rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-lg font-semibold text-text-primary">
                  {dialogState === "rendering"
                    ? "Enviando a Revid AI..."
                    : "Creando tu video..."}
                </p>
                <p className="text-sm text-text-secondary mt-2">
                  Esto puede tomar entre 1 y 5 minutos.
                  <br />
                  No cierres esta ventana.
                </p>
              </div>
            </div>
          )}

          {/* ── SUCCESS STATE ── */}
          {dialogState === "success" && videoUrl && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Video creado
                </h3>
              </div>

              {/* Video preview */}
              <div className="rounded-xl overflow-hidden border border-border-glass">
                <video
                  src={videoUrl}
                  controls
                  className="w-full"
                  poster=""
                />
              </div>

              <div className="flex gap-3">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl border border-border-glass text-sm font-medium text-text-secondary hover:bg-bg-glass-hover transition-all text-center"
                >
                  Abrir video
                </a>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {dialogState === "error" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-14 h-14 rounded-full bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-text-primary">
                  Error
                </h3>
                <p className="text-sm text-text-secondary mt-2 max-w-sm">
                  {errorMessage}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDialogState("form")}
                  className="px-6 py-2.5 rounded-xl border border-border-glass text-sm font-medium text-text-secondary hover:bg-bg-glass-hover transition-all"
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-bg-glass-hover text-sm font-medium text-text-primary transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
