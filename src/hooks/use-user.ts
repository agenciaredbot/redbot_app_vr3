"use client";

import { create } from "zustand";
import type { UserProfile, Organization } from "@/lib/supabase/types";

interface UserState {
  user: UserProfile | null;
  organization: Organization | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setOrganization: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  organization: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, organization: null, isLoading: false }),
}));
