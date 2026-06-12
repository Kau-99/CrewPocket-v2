import { NextResponse } from "next/server";

import { getAdminAuth, getAdminDb, verifyBearer } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const OWNED_COLLECTIONS = [
  "clients",
  "jobs",
  "estimates",
  "invoices",
  "crewMembers",
  "timeLogs",
  "mileageLogs",
  "inventoryItems",
  "pricebookItems",
];

const USER_DOCS = ["settings", "subscriptions", "customers"];

/**
 * Deletar conta (SPEC §6.5): apaga todos os dados via Admin SDK em batches
 * e remove o usuário do Auth. A confirmação digitada acontece no client.
 * Fotos no Storage expiram com as rules (sem dono) — limpeza via console.
 */
export async function POST(request: Request) {
  const user = await verifyBearer(request);
  if (!user) return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
  if (isRateLimited(`delete:${user.uid}`, 3, 60_000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  try {
    const db = getAdminDb();

    for (const collectionName of OWNED_COLLECTIONS) {
      // batches de 400 (limite 500) até esvaziar
      for (;;) {
        const snapshot = await db
          .collection(collectionName)
          .where("ownerId", "==", user.uid)
          .limit(400)
          .get();
        if (snapshot.empty) break;
        const batch = db.batch();
        for (const docSnap of snapshot.docs) batch.delete(docSnap.ref);
        await batch.commit();
      }
    }

    const userDocsBatch = db.batch();
    for (const collectionName of USER_DOCS) {
      userDocsBatch.delete(db.collection(collectionName).doc(user.uid));
    }
    await userDocsBatch.commit();

    await getAdminAuth().deleteUser(user.uid);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error("account deletion failed", {
      uid: user.uid,
      route: "/api/account/delete",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}
