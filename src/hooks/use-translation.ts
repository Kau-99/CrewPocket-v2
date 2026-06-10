"use client";

import { dictionaries, type Dictionary } from "@/i18n";

import { useUiStore } from "./use-ui-store";

export function useTranslation(): Dictionary {
  const language = useUiStore((state) => state.language);
  return dictionaries[language];
}
