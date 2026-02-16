"use client";

import { useState, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";

interface ImageUploadProps {
  propertyId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export function ImageUpload({
  propertyId,
  images,
  onImagesChange,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));

      try {
        const res = await fetch(`/api/properties/${propertyId}/images`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error);
          return;
        }

        if (data.errors?.length > 0) {
          setError(data.errors.join(", "));
        }

        if (data.uploaded?.length > 0) {
          onImagesChange([...images, ...data.uploaded]);
        }
      } catch {
        setError("Error subiendo imágenes");
      } finally {
        setUploading(false);
      }
    },
    [propertyId, images, onImagesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) uploadFiles(files);
    },
    [uploadFiles]
  );

  const handleDelete = async (imageUrl: string) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        onImagesChange(data.images);
      }
    } catch {
      setError("Error eliminando imagen");
    }
  };

  return (
    <GlassCard>
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Imágenes
      </h2>

      {error && (
        <div className="mb-3 p-2 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
          {error}
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {images.map((url, idx) => (
            <div key={url} className="relative group aspect-square rounded-xl overflow-hidden bg-bg-glass">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Imagen ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] bg-accent-blue/80 text-white rounded-md">
                  Principal
                </span>
              )}
              <button
                onClick={() => handleDelete(url)}
                className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-red/80"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${
            dragOver
              ? "border-accent-blue bg-accent-blue/5"
              : "border-border-glass hover:border-border-glass-hover"
          }
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) uploadFiles(files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Subiendo...</span>
          </div>
        ) : (
          <>
            <svg
              className="w-8 h-8 mx-auto mb-2 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-text-secondary text-sm">
              Arrastra imágenes o haz clic para seleccionar
            </p>
            <p className="text-text-muted text-xs mt-1">
              JPG, PNG, WebP — Máx. 5MB por imagen, 20 imágenes
            </p>
          </>
        )}
      </div>
    </GlassCard>
  );
}
