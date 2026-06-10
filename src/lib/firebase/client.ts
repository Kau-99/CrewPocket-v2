import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

import { env } from "@/env";

declare global {
  // eslint-disable-next-line no-var -- contrato global do SDK de App Check
  var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

const useEmulators = env.NEXT_PUBLIC_USE_EMULATORS === "true";

function createApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();

  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

  // App Check (SPEC §6.5): reCAPTCHA v3 em produção real; com emulators não há
  // backend de App Check, então fica desligado (ADR-008).
  if (typeof window !== "undefined" && !useEmulators) {
    if (env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN) {
      globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }

  return app;
}

function createFirestore(app: FirebaseApp): Firestore {
  // Offline-first (SPEC §7): cache persistente multi-aba. IndexedDB só existe
  // no browser; no servidor (RSC/SSR) usa a instância padrão sem cache.
  if (typeof window === "undefined") return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // HMR/dupla importação: instância já inicializada
    return getFirestore(app);
  }
}

const app = createApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = createFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Conectar emulators uma única vez, apenas no browser
declare global {
  // eslint-disable-next-line no-var -- flag de módulo sobrevivendo ao HMR do Next
  var __crewpocketEmulatorsConnected: boolean | undefined;
}

if (useEmulators && typeof window !== "undefined" && !globalThis.__crewpocketEmulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  globalThis.__crewpocketEmulatorsConnected = true;
}
