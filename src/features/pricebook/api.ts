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

import { pricebookItemSchema, type PricebookItem } from "./schemas";

const converter = createConverter(COLLECTIONS.pricebookItems, pricebookItemSchema);

export const pricebookFormSchema = pricebookItemSchema.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
});

export type PricebookFormValues = z.infer<typeof pricebookFormSchema>;

/** Catálogo pequeno — fetch único, busca client-side (ADR-011). */
export async function fetchPricebook(uid: string): Promise<PricebookItem[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.pricebookItems).withConverter(converter),
      where("ownerId", "==", uid),
    ),
  );
  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isNotNull)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createPricebookItem(
  uid: string,
  values: PricebookFormValues,
): Promise<PricebookItem> {
  const item = pricebookItemSchema.parse({ ...newEntityBase(uid), ...values });
  commitWrite(setDoc(doc(db, COLLECTIONS.pricebookItems, item.id), item), {
    collection: COLLECTIONS.pricebookItems,
    docId: item.id,
    op: "set",
  });
  return Promise.resolve(item);
}

export function updatePricebookItem(
  current: PricebookItem,
  values: PricebookFormValues,
): Promise<PricebookItem> {
  const updated = pricebookItemSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.pricebookItems, updated.id), updated), {
    collection: COLLECTIONS.pricebookItems,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function deletePricebookItem(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.pricebookItems, id)), {
    collection: COLLECTIONS.pricebookItems,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restorePricebookItem(item: PricebookItem): Promise<void> {
  commitWrite(
    setDoc(doc(db, COLLECTIONS.pricebookItems, item.id), pricebookItemSchema.parse(item)),
    {
      collection: COLLECTIONS.pricebookItems,
      docId: item.id,
      op: "set",
    },
  );
  return Promise.resolve();
}
