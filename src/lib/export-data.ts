import { Timestamp, collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";

const EXPORTED: string[] = [
  COLLECTIONS.clients,
  COLLECTIONS.jobs,
  COLLECTIONS.estimates,
  COLLECTIONS.estimateTemplates,
  COLLECTIONS.invoices,
  COLLECTIONS.crewMembers,
  COLLECTIONS.timeLogs,
  COLLECTIONS.mileageLogs,
  COLLECTIONS.inventoryItems,
  COLLECTIONS.equipmentItems,
  COLLECTIONS.pricebookItems,
];

/** Timestamps → ISO para um JSON legível e portável (backup/propriedade dos dados). */
function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, serialize(val)]),
    );
  }
  return value;
}

/**
 * Exporta TODOS os dados do dono num único JSON (SPEC §6.2 — backup do plano
 * Pro / propriedade dos dados). Lê coleções por nome, sem importar features.
 */
export async function exportAllData(uid: string): Promise<Blob> {
  const out: Record<string, unknown[]> = {};
  for (const name of EXPORTED) {
    const snapshot = await getDocs(query(collection(db, name), where("ownerId", "==", uid)));
    out[name] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(serialize(docSnap.data()) as Record<string, unknown>),
    }));
  }
  const payload = { exportedAt: new Date().toISOString(), uid, data: out };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

/** Dispara o download de um Blob no browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
