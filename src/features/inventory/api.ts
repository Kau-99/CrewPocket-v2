import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { z } from "zod";

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { newEntityBase } from "@/lib/firestore/schema-helpers";
import { commitWrite } from "@/lib/firestore/write";

import { inventoryItemSchema, type InventoryItem } from "./schemas";

const converter = createConverter(COLLECTIONS.inventoryItems, inventoryItemSchema);

export const inventoryFormSchema = inventoryItemSchema.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
});

export type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

/** Catálogo pequeno — fetch único (ADR-011). */
export async function fetchInventory(uid: string): Promise<InventoryItem[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.inventoryItems).withConverter(converter),
      where("ownerId", "==", uid),
    ),
  );
  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isNotNull)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createInventoryItem(
  uid: string,
  values: InventoryFormValues,
): Promise<InventoryItem> {
  const item = inventoryItemSchema.parse({ ...newEntityBase(uid), ...values });
  commitWrite(setDoc(doc(db, COLLECTIONS.inventoryItems, item.id), item), {
    collection: COLLECTIONS.inventoryItems,
    docId: item.id,
    op: "set",
  });
  return Promise.resolve(item);
}

export function updateInventoryItem(
  current: InventoryItem,
  values: InventoryFormValues,
): Promise<InventoryItem> {
  const updated = inventoryItemSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.inventoryItems, updated.id), updated), {
    collection: COLLECTIONS.inventoryItems,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function deleteInventoryItem(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.inventoryItems, id)), {
    collection: COLLECTIONS.inventoryItems,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restoreInventoryItem(item: InventoryItem): Promise<void> {
  commitWrite(
    setDoc(doc(db, COLLECTIONS.inventoryItems, item.id), inventoryItemSchema.parse(item)),
    { collection: COLLECTIONS.inventoryItems, docId: item.id, op: "set" },
  );
  return Promise.resolve();
}
