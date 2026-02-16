"use client";

import { useState } from "react";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] bg-bg-secondary rounded-2xl flex items-center justify-center">
        <svg
          className="w-16 h-16 text-text-muted opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-bg-secondary relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeIndex]}
          alt={`${title} - Imagen ${activeIndex + 1}`}
          className="w-full h-full object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setActiveIndex(
                  (prev) => (prev - 1 + images.length) % images.length
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev + 1) % images.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/50 text-white text-xs backdrop-blur-sm">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, idx) => (
            <button
              key={url}
              onClick={() => setActiveIndex(idx)}
              className={`
                flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all
                ${
                  idx === activeIndex
                    ? "border-accent-blue opacity-100"
                    : "border-transparent opacity-60 hover:opacity-80"
                }
              `}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
