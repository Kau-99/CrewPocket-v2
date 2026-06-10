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
    return subscribeToSettings(uid, (settings) => {
      setState({ settings, loading: false });
    });
  }, [uid]);

  // Idioma do doc → store de UI (dicionário ativo)
  const language = state.settings?.language;
  useEffect(() => {
    if (language) setLanguage(language);
  }, [language, setLanguage]);

  return state;
}
