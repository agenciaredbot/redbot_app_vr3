interface ChatHeaderProps {
  agentName: string;
  onMinimize: () => void;
  onClear: () => void;
}

export function ChatHeader({ agentName, onMinimize, onClear }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-glass">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{agentName}</p>
          <p className="text-[10px] text-accent-green">En línea</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onClear}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.05] text-text-muted hover:text-text-secondary transition-colors"
          title="Limpiar chat"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button
          onClick={onMinimize}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.05] text-text-muted hover:text-text-secondary transition-colors"
          title="Minimizar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
