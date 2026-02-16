import { forwardRef, type SelectHTMLAttributes } from "react";

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  function GlassSelect(
    { label, error, options, placeholder, className = "", ...props },
    ref
  ) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-xl
            bg-white/[0.05] border border-border-glass
            text-text-primary
            focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-transparent
            transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none
            bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2394A3B8%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]
            bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat
            pr-10
            ${error ? "border-accent-red/50 focus:ring-accent-red/50" : ""}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" className="bg-bg-secondary text-text-muted">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-bg-secondary text-text-primary"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-accent-red">{error}</p>}
      </div>
    );
  }
);
