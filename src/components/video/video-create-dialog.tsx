"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Property } from "@/lib/supabase/types";
import type { RevidWorkflow } from "@/lib/video/types";
import { VIDEO_PRESETS, VOICE_OPTIONS, DEFAULT_VOICE_ID } from "@/lib/video/types";
import { generatePropertyScript } from "@/lib/video/script-generator";

/* ─── Types ─── */

type ModalState = "form" | "submitting" | "error";

interface RenderJob {
  videoProjectId: string;
  propertyTitle: string;
  status: "rendering" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  startedAt: number;
}

interface VideoCreateDialogProps {
  property: Property;
  orgSlug: string;
  open: boolean;
  onClose: () => void;
}

/* ─── Component ─── */

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
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID);
  const [enableCaptions, setEnableCaptions] = useState(true);
  const [aspectRatio, setAspectRatio] = useState("9 / 16");

  // Modal state (only for form + initial submit)
  const [modalState, setModalState] = useState<ModalState>("form");
  const [modalError, setModalError] = useState("");

  // Active render jobs (persists after modal closes)
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Video preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const images = (property.images as string[]) || [];
  const propertyTitle =
    typeof property.title === "string"
      ? property.title
      : (property.title as Record<string, string>)?.es || "Propiedad";

  // Initialize form on modal open
  useEffect(() => {
    if (open) {
      setModalState("form");
      setModalError("");
      setPreset("showcase");
      setSelectedImages(images.slice(0, 10));
      setScript(generatePropertyScript(property));
      setEnableVoice(true);
      setVoiceId(DEFAULT_VOICE_ID);
      setEnableCaptions(true);
      setAspectRatio("9 / 16");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle image selection
  const toggleImage = useCallback((url: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 10) return prev;
      return [...prev, url];
    });
  }, []);

  const getWorkflow = (): RevidWorkflow => {
    const p = VIDEO_PRESETS.find((vp) => vp.id === preset);
    return p?.workflow || "script-to-video";
  };

  // ─── Polling logic (runs independently of modal) ───

  const pollJobs = useCallback(async () => {
    setJobs((prev) => {
      const rendering = prev.filter((j) => j.status === "rendering");
      if (rendering.length === 0 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return prev;
    });

    // Check each rendering job
    setJobs((prev) =>
      prev.map((job) => {
        if (job.status !== "rendering") return job;

        // Fire async check (we update state in the .then)
        fetch(`/api/video/status?videoProjectId=${job.videoProjectId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "completed" && data.videoUrl) {
              setJobs((curr) =>
                curr.map((j) =>
                  j.videoProjectId === job.videoProjectId
                    ? { ...j, status: "completed" as const, videoUrl: data.videoUrl }
                    : j
                )
              );
            } else if (data.status === "failed") {
              setJobs((curr) =>
                curr.map((j) =>
                  j.videoProjectId === job.videoProjectId
                    ? { ...j, status: "failed" as const, error: data.error }
                    : j
                )
              );
            }
          })
          .catch(() => {
            /* continue polling */
          });

        return job;
      })
    );
  }, []);

  // Start/stop polling based on active jobs
  useEffect(() => {
    const hasRendering = jobs.some((j) => j.status === "rendering");
    if (hasRendering && !pollRef.current) {
      pollRef.current = setInterval(pollJobs, 8000); // every 8s
    }
    if (!hasRendering && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [jobs, pollJobs]);

  // ─── Submit render ───

  const handleRender = async () => {
    setModalState("submitting");
    setModalError("");

    try {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          workflow: getWorkflow(),
          script,
          imageUrls: selectedImages,
          voiceId: enableVoice ? voiceId : undefined,
          aspectRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.error || "Error al iniciar el video.");
        setModalState("error");
        return;
      }

      // Add job and close modal immediately
      const newJob: RenderJob = {
        videoProjectId: data.videoProjectId,
        propertyTitle,
        status: "rendering",
        startedAt: Date.now(),
      };

      setJobs((prev) => [newJob, ...prev]);
      onClose(); // Close modal — user can keep working
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Error de conexión"
      );
      setModalState("error");
    }
  };

  // ─── Dismiss a job from the bar ───

  const dismissJob = (vpId: string) => {
    setJobs((prev) => prev.filter((j) => j.videoProjectId !== vpId));
  };

  // ─── Elapsed time formatter ───

  const formatElapsed = (startedAt: number) => {
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins}m ${remainSecs}s`;
  };

  // Force re-render for elapsed timer
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasRendering = jobs.some((j) => j.status === "rendering");
    if (!hasRendering) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [jobs]);

  return (
    <>
      {/* ═══ MODAL (only for form) ═══ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={modalState === "form" ? onClose : undefined}
          />

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
              {/* ── FORM ── */}
              {(modalState === "form" || modalState === "submitting") && (
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
                          disabled={modalState === "submitting"}
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

                  {/* Image selector */}
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
                            disabled={modalState === "submitting"}
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
                      {getWorkflow() === "prompt-to-video" ? "Prompt" : "Guión"}
                    </label>
                    <textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      rows={6}
                      disabled={modalState === "submitting"}
                      className="w-full px-4 py-3 rounded-xl bg-bg-glass border border-border-glass text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/50 resize-none disabled:opacity-50"
                      placeholder={
                        getWorkflow() === "prompt-to-video"
                          ? "Describe el video que quieres crear..."
                          : "El guión para tu video..."
                      }
                    />
                  </div>

                  {/* Voice selector */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-text-primary">
                        Voz del narrador
                      </label>
                      <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableVoice}
                          onChange={(e) => setEnableVoice(e.target.checked)}
                          disabled={modalState === "submitting"}
                          className="rounded border-border-glass w-3.5 h-3.5"
                        />
                        Activar voz
                      </label>
                    </div>

                    {enableVoice && (
                      <div className="space-y-3">
                        {/* Female voices */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Voces femeninas</p>
                          <div className="space-y-1.5">
                            {VOICE_OPTIONS.filter((v) => v.gender === "female").map((voice) => (
                              <button
                                key={voice.id}
                                onClick={() => setVoiceId(voice.id)}
                                disabled={modalState === "submitting"}
                                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                  voiceId === voice.id
                                    ? "border-accent-purple bg-accent-purple/10"
                                    : "border-border-glass hover:border-border-glass-hover hover:bg-bg-glass-hover"
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  voiceId === voice.id ? "bg-accent-purple/20" : "bg-white/5"
                                }`}>
                                  <svg className={`w-4 h-4 ${voiceId === voice.id ? "text-accent-purple" : "text-text-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary">{voice.name}</span>
                                    {voice.tags.map((tag) => (
                                      <span key={tag} className="px-1.5 py-0.5 text-[9px] rounded-full bg-white/5 text-text-muted">{tag}</span>
                                    ))}
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{voice.description}</p>
                                </div>
                                {voiceId === voice.id && (
                                  <div className="w-5 h-5 rounded-full bg-accent-purple flex items-center justify-center flex-shrink-0 mt-1">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Male voices */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Voces masculinas</p>
                          <div className="space-y-1.5">
                            {VOICE_OPTIONS.filter((v) => v.gender === "male").map((voice) => (
                              <button
                                key={voice.id}
                                onClick={() => setVoiceId(voice.id)}
                                disabled={modalState === "submitting"}
                                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                  voiceId === voice.id
                                    ? "border-accent-purple bg-accent-purple/10"
                                    : "border-border-glass hover:border-border-glass-hover hover:bg-bg-glass-hover"
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  voiceId === voice.id ? "bg-accent-purple/20" : "bg-white/5"
                                }`}>
                                  <svg className={`w-4 h-4 ${voiceId === voice.id ? "text-accent-purple" : "text-text-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary">{voice.name}</span>
                                    {voice.tags.map((tag) => (
                                      <span key={tag} className="px-1.5 py-0.5 text-[9px] rounded-full bg-white/5 text-text-muted">{tag}</span>
                                    ))}
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{voice.description}</p>
                                </div>
                                {voiceId === voice.id && (
                                  <div className="w-5 h-5 rounded-full bg-accent-purple flex items-center justify-center flex-shrink-0 mt-1">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options row */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableCaptions}
                        onChange={(e) => setEnableCaptions(e.target.checked)}
                        disabled={modalState === "submitting"}
                        className="rounded border-border-glass"
                      />
                      Subtítulos
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      disabled={modalState === "submitting"}
                      className="px-3 py-1.5 rounded-lg bg-bg-glass border border-border-glass text-sm text-text-primary"
                    >
                      <option value="9 / 16">Vertical (9:16)</option>
                      <option value="16 / 9">Horizontal (16:9)</option>
                    </select>
                  </div>

                  {/* Render button */}
                  <button
                    onClick={handleRender}
                    disabled={!script.trim() || modalState === "submitting"}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {modalState === "submitting" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Crear Video"
                    )}
                  </button>
                </div>
              )}

              {/* ── ERROR (submit failed) ── */}
              {modalState === "error" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="w-14 h-14 rounded-full bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-text-primary">Error</h3>
                    <p className="text-sm text-text-secondary mt-2 max-w-sm">{modalError}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalState("form")}
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
      )}

      {/* ═══ VIDEO PREVIEW MODAL ═══ */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewUrl(null)}
          />
          <div className="relative w-full max-w-lg bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-glass">
              <span className="text-sm font-semibold text-text-primary">Video listo</span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1 rounded-lg hover:bg-white/5 text-text-muted"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video src={previewUrl} controls autoPlay className="w-full" />
            <div className="p-4 flex gap-3">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl border border-border-glass text-sm font-medium text-text-secondary hover:bg-bg-glass-hover transition-all text-center"
              >
                Abrir en nueva pestaña
              </a>
              <button
                onClick={() => setPreviewUrl(null)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROGRESS BAR (fixed bottom, non-blocking) ═══ */}
      {jobs.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 max-w-sm w-full">
          {jobs.map((job) => (
            <div
              key={job.videoProjectId}
              className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-xl shadow-2xl shadow-black/20 overflow-hidden"
            >
              {/* Animated progress bar for rendering */}
              {job.status === "rendering" && (
                <div className="h-1 bg-accent-purple/20 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-purple to-accent-blue animate-[progress_2s_ease-in-out_infinite] w-1/3" />
                </div>
              )}
              {job.status === "completed" && (
                <div className="h-1 bg-accent-green" />
              )}
              {job.status === "failed" && (
                <div className="h-1 bg-accent-red" />
              )}

              <div className="px-4 py-3 flex items-center gap-3">
                {/* Icon */}
                {job.status === "rendering" && (
                  <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
                  </div>
                )}
                {job.status === "completed" && (
                  <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-accent-green/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {job.status === "failed" && (
                  <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-accent-red/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {job.status === "rendering" && "Creando video..."}
                    {job.status === "completed" && "Video listo"}
                    {job.status === "failed" && "Error al crear video"}
                  </p>
                  <p className="text-[10px] text-text-muted truncate">
                    {job.propertyTitle}
                    {job.status === "rendering" && ` · ${formatElapsed(job.startedAt)}`}
                  </p>
                </div>

                {/* Actions */}
                {job.status === "completed" && job.videoUrl && (
                  <button
                    onClick={() => setPreviewUrl(job.videoUrl!)}
                    className="px-3 py-1.5 rounded-lg bg-accent-green/10 text-accent-green text-xs font-medium hover:bg-accent-green/20 transition-colors flex-shrink-0"
                  >
                    Ver
                  </button>
                )}

                {/* Dismiss */}
                {job.status !== "rendering" && (
                  <button
                    onClick={() => dismissJob(job.videoProjectId)}
                    className="p-1 rounded-lg hover:bg-white/5 text-text-muted flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS for progress animation */}
      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </>
  );
}
