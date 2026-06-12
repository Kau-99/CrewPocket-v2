import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { commitWrite } from "@/lib/firestore/write";
import { logger } from "@/lib/logger";

import { buildDefaultSettings, settingsSchema, type Settings } from "./schemas";

function settingsRef(uid: string) {
  return doc(db, COLLECTIONS.settings, uid);
}

/**
 * Observa settings/{uid}. `null` = doc não existe (primeiro login → onboarding).
 * Leitura sempre via safeParse (SPEC §3.2.4): doc inválido vira log + null,
 * nunca exceção na UI.
 */
export function subscribeToSettings(
  uid: string,
  onChange: (settings: Settings | null) => void,
  onError?: () => void,
): () => void {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        // cache-miss ≠ doc inexistente: só o servidor confirma "primeiro
        // login" (senão o onboarding aparece indevidamente)
        if (!snapshot.metadata.fromCache) onChange(null);
        return;
      }
      const parsed = settingsSchema.safeParse(snapshot.data());
      if (!parsed.success) {
        logger.error("settings doc failed validation", {
          uid,
          issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.code}`),
        });
        onChange(null);
        return;
      }
      onChange(parsed.data);
    },
    (error) => {
      // erro encerra o listener — o chamador re-assina com backoff
      logger.error("settings subscription error", { uid, code: error.code });
      onError?.();
    },
  );
}

/** Escrita sempre via schema.parse antes do setDoc (SPEC §3.2.5). */
export async function createSettings(uid: string, companyName: string): Promise<void> {
  const settings = buildDefaultSettings(companyName.trim());
  await setDoc(settingsRef(uid), settingsSchema.parse(settings));
}

/** Update parcial validado — offline-first via commitWrite (ADR-016). */
export function updateSettings(
  uid: string,
  current: Settings,
  partial: Partial<Settings>,
): Promise<Settings> {
  const updated = settingsSchema.parse({ ...current, ...partial });
  commitWrite(setDoc(settingsRef(uid), updated), {
    collection: COLLECTIONS.settings,
    docId: uid,
    op: "set",
  });
  return Promise.resolve(updated);
}
