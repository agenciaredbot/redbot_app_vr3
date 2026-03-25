"use client";

import { useRef, useState } from "react";

export function DemoVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.muted = false;
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="bg-bg-primary rounded-[1.5rem] overflow-hidden aspect-[9/16] relative group">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/marketing/assets/demo-video-ai.mp4"
        playsInline
        muted
        loop
        preload="metadata"
      />
      {/* Play button overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 transition-opacity cursor-pointer"
        style={{
          opacity: playing ? 0 : 1,
          pointerEvents: playing ? "none" : "auto",
        }}
        onClick={togglePlay}
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent-red to-accent-indigo flex items-center justify-center shadow-lg shadow-accent-red/30 hover:scale-110 transition-transform cursor-pointer">
          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {/* Glassmorphism label */}
        <div className="mt-4 px-4 py-2 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] shadow-lg">
          <p className="text-xs text-white text-center font-medium">
            Video generado con IA desde tu propiedad
          </p>
        </div>
      </div>
    </div>
  );
}
