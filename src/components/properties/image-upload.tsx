"use client";

import { useState, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { compressImage } from "@/lib/utils/compress-image";

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
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setError(null);

      // Compress images before upload
      setCompressing(true);
      let compressed: File[];
      try {
        compressed = await Promise.all(files.map(compressImage));
      } catch {
        compressed = files;
      }
      setCompressing(false);

      setUploading(true);
      const formData = new FormData();
      compressed.forEach((f) => formData.append("images", f));

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

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      // Only handle file drops (not image reorder drops)
      if (e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length > 0) uploadFiles(files);
      }
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

  // --- Reorder drag-and-drop handlers ---
  const handleReorderDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleReorderDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    // Only show drop indicator for image reorder (not file uploads)
    if (dragIdx !== null) {
      setDropIdx(idx);
    }
  };

  const handleReorderDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDropIdx(null);
      return;
    }

    const reordered = [...images];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Update UI immediately
    onImagesChange(reordered);
    setDragIdx(null);
    setDropIdx(null);

    // Persist new order
    try {
      await fetch(`/api/properties/${propertyId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: reordered }),
      });
    } catch {
      // Revert on error
      onImagesChange(images);
      setError("Error al reordenar imágenes");
    }
  };

  const handleReorderDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  const isProcessing = compressing || uploading;

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

      {/* Image grid with reorder */}
      {images.length > 0 && (
        <>
          <p className="text-text-muted text-xs mb-2">
            Arrastra para reordenar. La primera imagen es la principal.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {images.map((url, idx) => (
              <div
                key={url}
                draggable
                onDragStart={() => handleReorderDragStart(idx)}
                onDragOver={(e) => handleReorderDragOver(e, idx)}
                onDrop={(e) => handleReorderDrop(e, idx)}
                onDragEnd={handleReorderDragEnd}
                className={`
                  relative group aspect-square rounded-xl overflow-hidden bg-bg-glass cursor-grab active:cursor-grabbing transition-all
                  ${dragIdx === idx ? "opacity-40 scale-95" : ""}
                  ${dropIdx === idx && dragIdx !== idx ? "ring-2 ring-accent-blue ring-offset-2 ring-offset-transparent" : ""}
                `}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Imagen ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] bg-accent-blue/80 text-white rounded-md">
                    Principal
                  </span>
                )}
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 text-[10px] bg-black/50 text-white/70 rounded-md">
                  {idx + 1}
                </div>
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
        </>
      )}

      {/* Drop zone for new files */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          // Only show file drop highlight when NOT reordering images
          if (dragIdx === null) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${
            dragOver
              ? "border-accent-blue bg-accent-blue/5"
              : "border-border-glass hover:border-border-glass-hover"
          }
          ${isProcessing ? "opacity-50 pointer-events-none" : ""}
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
        {compressing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">
              Optimizando imágenes...
            </span>
          </div>
        ) : uploading ? (
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
              JPG, PNG, WebP — Máx. 5MB por imagen, 20 imágenes.
              Se optimizan automáticamente.
            </p>
          </>
        )}
      </div>
    </GlassCard>
  );
}
