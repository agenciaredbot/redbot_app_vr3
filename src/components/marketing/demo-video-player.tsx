"use client";

import { useRef, useState, useCallback } from "react";

export function DemoVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      video.muted = false;
      video.play();
      setPlaying(true);
      setMuted(false);
      setEnded(false);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setEnded(true);
  }, []);

  return (
    <div className="bg-bg-primary rounded-[1.5rem] overflow-hidden aspect-[9/16] relative group">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/marketing/assets/demo-video-ai.mp4"
        playsInline
        muted
        preload="metadata"
        onEnded={handleEnded}
      />

      {/* Initial play overlay — shown when not playing */}
      {!playing && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 cursor-pointer z-10"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent-red to-accent-indigo flex items-center justify-center shadow-lg shadow-accent-red/30 hover:scale-110 transition-transform">
            {ended ? (
              /* Replay icon */
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            ) : (
              /* Play icon */
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
          {/* Glassmorphism label */}
          <div className="mt-4 px-4 py-2 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] shadow-lg">
            <p className="text-xs text-white text-center font-medium">
              {ended
                ? "Ver de nuevo"
                : "Video generado con IA desde tu propiedad"}
            </p>
          </div>
        </div>
      )}

      {/* Controls bar — visible when playing (on hover or always on mobile) */}
      {playing && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0 [.group:active_&]:opacity-100">
          <div className="flex items-center gap-2">
            {/* Pause button */}
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Pausar"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </button>

            {/* Mute/Unmute button */}
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label={muted ? "Activar sonido" : "Silenciar"}
            >
              {muted ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Click anywhere on video to pause */}
      {playing && (
        <div
          className="absolute inset-0 z-[5] cursor-pointer"
          onClick={togglePlay}
        />
      )}
    </div>
  );
}
