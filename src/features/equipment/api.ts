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

import { equipmentItemSchema, type EquipmentItem } from "./schemas";

const converter = createConverter(COLLECTIONS.equipmentItems, equipmentItemSchema);

export const equipmentFormSchema = equipmentItemSchema.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
});

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

/** Catálogo pequeno — fetch único (ADR-011). */
export async function fetchEquipment(uid: string): Promise<EquipmentItem[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.equipmentItems).withConverter(converter),
      where("ownerId", "==", uid),
    ),
  );
  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isNotNull)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createEquipmentItem(
  uid: string,
  values: EquipmentFormValues,
): Promise<EquipmentItem> {
  const item = equipmentItemSchema.parse({ ...newEntityBase(uid), ...values });
  commitWrite(setDoc(doc(db, COLLECTIONS.equipmentItems, item.id), item), {
    collection: COLLECTIONS.equipmentItems,
    docId: item.id,
    op: "set",
  });
  return Promise.resolve(item);
}

export function updateEquipmentItem(
  current: EquipmentItem,
  values: EquipmentFormValues,
): Promise<EquipmentItem> {
  const updated = equipmentItemSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.equipmentItems, updated.id), updated), {
    collection: COLLECTIONS.equipmentItems,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function deleteEquipmentItem(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.equipmentItems, id)), {
    collection: COLLECTIONS.equipmentItems,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restoreEquipmentItem(item: EquipmentItem): Promise<void> {
  commitWrite(
    setDoc(doc(db, COLLECTIONS.equipmentItems, item.id), equipmentItemSchema.parse(item)),
    {
      collection: COLLECTIONS.equipmentItems,
      docId: item.id,
      op: "set",
    },
  );
  return Promise.resolve();
}
