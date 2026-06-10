"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Locale } from "@/i18n";

/**
 * Zustand APENAS para estado de UI (SPEC §2): idioma, navegação mobile.
 * Dados de servidor vivem no TanStack Query/Firestore.
 */
interface UiState {
  language: Locale;
  setLanguage: (language: Locale) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => {
        set({ language });
      },
      mobileNavOpen: false,
      setMobileNavOpen: (mobileNavOpen) => {
        set({ mobileNavOpen });
      },
    }),
    {
      name: "crewpocket-ui",
      partialize: (state) => ({ language: state.language }),
    },
  ),
);
