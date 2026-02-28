"use client";

import { useRef } from "react";
import { useUserStore } from "@/hooks/use-user";
import type { UserProfile, Organization } from "@/lib/supabase/types";

interface StoreHydratorProps {
  user: UserProfile;
  organization: Organization;
}

/**
 * Hydrates the Zustand user store with server-fetched data.
 *
 * This component bridges the Next.js server/client boundary:
 * the admin layout (server component) fetches user and org data,
 * then passes it as serialized props to this client component,
 * which pushes it into the global Zustand store on first render.
 *
 * Uses useRef to ensure hydration runs exactly once and synchronously
 * (before children mount), avoiding a flash of "subscription not active".
 */
export function StoreHydrator({ user, organization }: StoreHydratorProps) {
  const hydrated = useRef(false);

  if (!hydrated.current) {
    useUserStore.getState().setUser(user);
    useUserStore.getState().setOrganization(organization);
    useUserStore.getState().setLoading(false);
    hydrated.current = true;
  }

  return null;
}
