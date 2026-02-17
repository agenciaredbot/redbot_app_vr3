"use client";

import { useState, useRef, useCallback } from "react";
import { compressImage } from "@/lib/utils/compress-image";

interface LogoUploadProps {
  type: "logo" | "favicon";
  currentUrl: string | null;
  onUploaded: (url: string | null) => void;
  disabled?: boolean;
  label: string;
  hint: string;
}

export function LogoUpload({
  type,
  currentUrl,
  onUploaded,
  disabled = false,
  label,
  hint,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxDimension = type === "logo" ? 512 : 256;
  const previewSize = type === "logo" ? "w-28 h-28" : "w-16 h-16";

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      try {
        // Compress
        const compressed = await compressImage(file, maxDimension);

        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("type", type);

        const res = await fetch("/api/organizations/logo", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Error subiendo imagen");
          return;
        }

        onUploaded(data.url);
      } catch {
        setError("Error de conexión");
      } finally {
        setUploading(false);
      }
    },
    [type, maxDimension, onUploaded]
  );

  const handleDelete = useCallback(async () => {
    setError(null);
    setUploading(true);

    try {
      const res = await fetch("/api/organizations/logo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        onUploaded(null);
      }
    } catch {
      setError("Error eliminando imagen");
    } finally {
      setUploading(false);
    }
  }, [type, onUploaded]);

  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-4">
        {/* Preview / Upload area */}
        <div
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          className={`
            relative group ${previewSize} rounded-xl overflow-hidden
            border-2 border-dashed border-border-glass
            flex items-center justify-center
            bg-white/[0.03]
            transition-all
            ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-accent-blue/50 hover:bg-white/[0.05]"}
          `}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          ) : currentUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt={label}
                className="w-full h-full object-contain p-1"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Cambiar</span>
                </div>
              )}
            </>
          ) : (
            <svg
              className="w-6 h-6 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex-1">
          <p className="text-xs text-text-muted">{hint}</p>
          {error && (
            <p className="text-xs text-accent-red mt-1">{error}</p>
          )}
          {currentUrl && !disabled && (
            <button
              onClick={handleDelete}
              disabled={uploading}
              className="text-xs text-accent-red hover:text-accent-red/80 transition-colors mt-1"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
