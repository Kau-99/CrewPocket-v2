"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useUiStore } from "@/hooks/use-ui-store";

import { subscribeToSettings } from "../api";
import type { Settings } from "../schemas";

interface SettingsState {
  settings: Settings | null;
  /** true enquanto o primeiro snapshot não chegou */
  loading: boolean;
}

/**
 * Observa settings/{uid} em tempo real. `settings === null && !loading`
 * significa primeiro login → onboarding obrigatório.
 */
export function useSettings(): SettingsState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<SettingsState>({ settings: null, loading: true });
  const setLanguage = useUiStore((store) => store.setLanguage);

  useEffect(() => {
    if (!uid) {
      setState({ settings: null, loading: false });
      return;
    }
    setState({ settings: null, loading: true });

    // erro do watch encerra o listener → re-assina com backoff
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let attempt = 0;
    const start = () => {
      unsubscribe = subscribeToSettings(
        uid,
        (settings) => {
          attempt = 0;
          setState({ settings, loading: false });
        },
        () => {
          if (cancelled) return;
          attempt += 1;
          setTimeout(
            () => {
              if (!cancelled) start();
            },
            Math.min(8_000, 1_000 * attempt),
          );
        },
      );
    };
    start();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [uid]);

  // Idioma do doc → store de UI (dicionário ativo)
  const language = state.settings?.language;
  useEffect(() => {
    if (language) setLanguage(language);
  }, [language, setLanguage]);

  return state;
}
