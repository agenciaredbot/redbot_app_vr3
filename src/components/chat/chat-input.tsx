"use client";

import { useState, useRef } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border-glass">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Escribe tu mensaje..."
        disabled={disabled}
        className="flex-1 px-3 py-2 rounded-xl bg-bg-glass border border-border-glass text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50 disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
        </svg>
      </button>
    </div>
  );
}
