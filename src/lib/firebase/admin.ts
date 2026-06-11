import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { env } from "@/env";

/**
 * Admin SDK APENAS em API routes (SPEC §2). Init lazy para não derrubar o
 * build quando os segredos não existem (ex.: CI com SKIP_ENV_VALIDATION).
 * Contra emulators, o SDK dispensa credencial (lê FIRESTORE_EMULATOR_HOST /
 * FIREBASE_AUTH_EMULATOR_HOST do ambiente).
 */
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (process.env.FIRESTORE_EMULATOR_HOST ?? process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: env.FIREBASE_ADMIN_PROJECT_ID });
  }

  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Vercel/dotenv guardam a chave com \n literais
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/** `Authorization: Bearer <Firebase ID token>` → uid (SPEC §6.1). */
export async function verifyBearer(
  request: Request,
): Promise<{ uid: string; email: string | undefined } | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice("Bearer ".length));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
