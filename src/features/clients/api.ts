import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { commitWrite } from "@/lib/firestore/write";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { newEntityBase } from "@/lib/firestore/schema-helpers";

import { clientSchema, type Client, type ClientFormValues } from "./schemas";

export const PAGE_SIZE = 25;

const converter = createConverter(COLLECTIONS.clients, clientSchema);

/** Covariante em unknown: o converter tipa os snapshots como T | null. */
export type PageCursor = QueryDocumentSnapshot<unknown>;

export interface ClientsPage {
  items: Client[];
  /** null = não há mais páginas (SPEC §8: cursor com startAfter, páginas de 25) */
  cursor: PageCursor | null;
}

export async function fetchClientsPage(
  uid: string,
  cursor: PageCursor | null,
): Promise<ClientsPage> {
  const constraints = [
    where("ownerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.clients).withConverter(converter), ...constraints),
  );
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return {
    items: snapshot.docs.map((docSnap) => docSnap.data()).filter(isNotNull),
    cursor: snapshot.docs.length === PAGE_SIZE && lastDoc ? lastDoc : null,
  };
}

export async function fetchClient(id: string): Promise<Client | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.clients, id).withConverter(converter));
  return snapshot.exists() ? snapshot.data() : null;
}

export function createClient(uid: string, values: ClientFormValues): Promise<Client> {
  const client = clientSchema.parse({ ...newEntityBase(uid), ...values, isArchived: false });
  commitWrite(setDoc(doc(db, COLLECTIONS.clients, client.id), client), {
    collection: COLLECTIONS.clients,
    docId: client.id,
    op: "set",
  });
  return Promise.resolve(client);
}

export function updateClient(
  current: Client,
  values: Partial<Omit<Client, "id" | "ownerId" | "createdAt" | "schemaVersion">>,
): Promise<Client> {
  const updated = clientSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.clients, updated.id), updated), {
    collection: COLLECTIONS.clients,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function setClientArchived(client: Client, isArchived: boolean): Promise<Client> {
  return updateClient(client, { isArchived });
}

export function deleteClient(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.clients, id)), {
    collection: COLLECTIONS.clients,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

/** Undo de hard delete: regrava o doc exatamente como era. */
export function restoreClient(client: Client): Promise<void> {
  commitWrite(setDoc(doc(db, COLLECTIONS.clients, client.id), clientSchema.parse(client)), {
    collection: COLLECTIONS.clients,
    docId: client.id,
    op: "set",
  });
  return Promise.resolve();
}
