import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { commitWrite } from "@/lib/firestore/write";
import { newEntityBase } from "@/lib/firestore/schema-helpers";

import { mileageLogSchema, type MileageLog } from "./schemas";

export const PAGE_SIZE = 25;

const converter = createConverter(COLLECTIONS.mileageLogs, mileageLogSchema);

export type PageCursor = QueryDocumentSnapshot<unknown>;

export interface MileagePage {
  items: MileageLog[];
  cursor: PageCursor | null;
}

export interface MileageFormValues {
  jobId: string | null;
  date: Date;
  miles: number;
  purpose: string;
}

/** Índice: ownerId + date desc. */
export async function fetchMileagePage(
  uid: string,
  cursor: PageCursor | null,
): Promise<MileagePage> {
  const constraints = [
    where("ownerId", "==", uid),
    orderBy("date", "desc"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.mileageLogs).withConverter(converter), ...constraints),
  );
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return {
    items: snapshot.docs.map((docSnap) => docSnap.data()).filter(isNotNull),
    cursor: snapshot.docs.length === PAGE_SIZE && lastDoc ? lastDoc : null,
  };
}

export function createMileageLog(uid: string, values: MileageFormValues): Promise<MileageLog> {
  const log = mileageLogSchema.parse({
    ...newEntityBase(uid),
    ...values,
    date: Timestamp.fromDate(values.date),
  });
  commitWrite(setDoc(doc(db, COLLECTIONS.mileageLogs, log.id), log), {
    collection: COLLECTIONS.mileageLogs,
    docId: log.id,
    op: "set",
  });
  return Promise.resolve(log);
}

export function updateMileageLog(
  current: MileageLog,
  values: MileageFormValues,
): Promise<MileageLog> {
  const updated = mileageLogSchema.parse({
    ...current,
    ...values,
    date: Timestamp.fromDate(values.date),
    updatedAt: Timestamp.now(),
  });
  commitWrite(setDoc(doc(db, COLLECTIONS.mileageLogs, updated.id), updated), {
    collection: COLLECTIONS.mileageLogs,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function deleteMileageLog(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.mileageLogs, id)), {
    collection: COLLECTIONS.mileageLogs,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restoreMileageLog(log: MileageLog): Promise<void> {
  commitWrite(setDoc(doc(db, COLLECTIONS.mileageLogs, log.id), mileageLogSchema.parse(log)), {
    collection: COLLECTIONS.mileageLogs,
    docId: log.id,
    op: "set",
  });
  return Promise.resolve();
}
