"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface GlassDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function GlassDialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  className = "",
}: GlassDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={`
        backdrop:bg-black/60 backdrop:backdrop-blur-sm
        bg-transparent p-4 max-w-lg w-full
        ${className}
      `}
    >
      <div className="bg-bg-secondary/95 backdrop-blur-xl border border-border-glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-6">
        {title && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            {description && (
              <p className="text-sm text-text-secondary mt-1">{description}</p>
            )}
          </div>
        )}

        {children}

        {actions && (
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-glass">
            {actions}
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </dialog>
  );
}
