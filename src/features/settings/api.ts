import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
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
): () => void {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
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
      logger.error("settings subscription error", { uid, code: error.code });
      onChange(null);
    },
  );
}

/** Escrita sempre via schema.parse antes do setDoc (SPEC §3.2.5). */
export async function createSettings(uid: string, companyName: string): Promise<void> {
  const settings = buildDefaultSettings(companyName.trim());
  await setDoc(settingsRef(uid), settingsSchema.parse(settings));
}
