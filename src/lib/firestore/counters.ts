import { doc, runTransaction } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";

/**
 * Números de estimate/invoice via incremento transacional em settings
 * (SPEC §5). Transações exigem conexão — criação numerada não funciona
 * offline (ADR-018); o chamador mapeia a falha para a mensagem "offline".
 */
export function nextDocumentNumber(
  uid: string,
  field: "estimateCounter" | "invoiceCounter",
  prefix: string,
): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, COLLECTIONS.settings, uid);
    const snapshot = await transaction.get(ref);
    const current = (snapshot.get(field) as number | undefined) ?? 1;
    transaction.update(ref, { [field]: current + 1 });
    return `${prefix}${String(current).padStart(4, "0")}`;
  });
}
