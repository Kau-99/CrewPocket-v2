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

export async function createClient(uid: string, values: ClientFormValues): Promise<Client> {
  const client = clientSchema.parse({ ...newEntityBase(uid), ...values, isArchived: false });
  await setDoc(doc(db, COLLECTIONS.clients, client.id), client);
  return client;
}

export async function updateClient(
  current: Client,
  values: Partial<Omit<Client, "id" | "ownerId" | "createdAt" | "schemaVersion">>,
): Promise<Client> {
  const updated = clientSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  await setDoc(doc(db, COLLECTIONS.clients, updated.id), updated);
  return updated;
}

export function setClientArchived(client: Client, isArchived: boolean): Promise<Client> {
  return updateClient(client, { isArchived });
}

export async function deleteClient(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.clients, id));
}

/** Undo de hard delete: regrava o doc exatamente como era. */
export async function restoreClient(client: Client): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.clients, client.id), clientSchema.parse(client));
}
