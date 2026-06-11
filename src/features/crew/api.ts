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

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { commitWrite } from "@/lib/firestore/write";
import { newEntityBase } from "@/lib/firestore/schema-helpers";
import type { z } from "zod";

import { crewMemberSchema, type CrewMember } from "./schemas";

const converter = createConverter(COLLECTIONS.crewMembers, crewMemberSchema);

/** Campos do form (rate chega em centavos já convertido na borda). */
export const crewFormSchema = crewMemberSchema.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
});

export type CrewFormValues = z.infer<typeof crewFormSchema>;

/** Equipes têm ≤ 5 membros (plano Pro) — fetch único, sem paginação. */
export async function fetchCrew(uid: string): Promise<CrewMember[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.crewMembers).withConverter(converter),
      where("ownerId", "==", uid),
    ),
  );
  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isNotNull)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createCrewMember(uid: string, values: CrewFormValues): Promise<CrewMember> {
  const member = crewMemberSchema.parse({ ...newEntityBase(uid), ...values });
  commitWrite(setDoc(doc(db, COLLECTIONS.crewMembers, member.id), member), {
    collection: COLLECTIONS.crewMembers,
    docId: member.id,
    op: "set",
  });
  return Promise.resolve(member);
}

export function updateCrewMember(current: CrewMember, values: CrewFormValues): Promise<CrewMember> {
  const updated = crewMemberSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.crewMembers, updated.id), updated), {
    collection: COLLECTIONS.crewMembers,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function deleteCrewMember(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.crewMembers, id)), {
    collection: COLLECTIONS.crewMembers,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restoreCrewMember(member: CrewMember): Promise<void> {
  commitWrite(setDoc(doc(db, COLLECTIONS.crewMembers, member.id), crewMemberSchema.parse(member)), {
    collection: COLLECTIONS.crewMembers,
    docId: member.id,
    op: "set",
  });
  return Promise.resolve();
}
