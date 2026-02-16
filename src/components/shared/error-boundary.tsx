"use client";

import { Component, type ReactNode } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <GlassCard padding="lg" className="max-w-md text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-accent-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Algo salió mal
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Ha ocurrido un error inesperado. Intenta recargar la página.
            </p>
            <GlassButton
              variant="secondary"
              onClick={() => this.setState({ hasError: false })}
            >
              Reintentar
            </GlassButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
