import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface BaseProps {
  label?: string;
  error?: string;
  helperText?: string;
}

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    variant?: "default" | "search";
  };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant?: "textarea";
  };

const baseClasses =
  "w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const errorClasses = "border-accent-red/50 focus:ring-accent-red/50";

export const GlassInput = forwardRef<
  HTMLInputElement,
  InputProps
>(function GlassInput({ label, error, helperText, variant = "default", className = "", ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {variant === "search" && (
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
        <input
          ref={ref}
          className={`${baseClasses} ${error ? errorClasses : ""} ${variant === "search" ? "pl-10" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-accent-red">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
});

export const GlassTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(function GlassTextarea({ label, error, helperText, className = "", ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`${baseClasses} min-h-[100px] resize-y ${error ? errorClasses : ""} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-accent-red">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
});
