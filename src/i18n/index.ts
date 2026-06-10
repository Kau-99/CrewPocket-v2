import { en, type Dictionary } from "./en";
import { es } from "./es";

export type { Dictionary };
export type Locale = "en" | "es";

export const defaultLocale: Locale = "en";

export const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
