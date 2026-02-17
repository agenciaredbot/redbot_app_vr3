"use client";

import { useEffect } from "react";

const PROPERTY_CONTEXT_KEY = "redbot-chat-property-context";

export interface PropertyContext {
  id: string;
  title: string;
  slug: string;
  propertyType: string;
  businessType: string;
  price: string;
  location: string;
}

/**
 * Invisible client component that writes the current property context
 * to sessionStorage so the chat agent can reference it.
 * Clears context on unmount (when user navigates away from property page).
 */
export function PropertyContextSetter({ context }: { context: PropertyContext }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(PROPERTY_CONTEXT_KEY, JSON.stringify(context));
    } catch {
      // ignore
    }
    return () => {
      try {
        sessionStorage.removeItem(PROPERTY_CONTEXT_KEY);
      } catch {
        // ignore
      }
    };
  }, [context]);

  return null;
}

/** Read current property context (if user is on a property page) */
export function getPropertyContext(): PropertyContext | null {
  try {
    const raw = sessionStorage.getItem(PROPERTY_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PropertyContext;
  } catch {
    return null;
  }
}
