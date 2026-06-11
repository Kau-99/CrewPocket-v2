import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { AppError } from "@/lib/errors";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { commitWrite } from "@/lib/firestore/write";
import { newEntityBase } from "@/lib/firestore/schema-helpers";

import { timeLogSchema, type TimeLog } from "./schemas";
import { clampClockOut } from "./utils";

const converter = createConverter(COLLECTIONS.timeLogs, timeLogSchema);

export interface ClockInInput {
  jobId: string;
  crewMemberId: string | null;
  crewName: string;
  gps: { lat: number; lng: number; accuracy: number } | null;
}

/**
 * Timer único por membro (SPEC §4.5): checagem por query antes de criar.
 * Guard client-side — suficiente para a persona e compatível com
 * offline-first; ver ADR-014.
 */
export async function clockIn(uid: string, input: ClockInInput): Promise<TimeLog> {
  const openSnapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.timeLogs).withConverter(converter),
      where("ownerId", "==", uid),
      where("clockOut", "==", null),
    ),
  );
  const alreadyOpen = openSnapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isNotNull)
    .some((log) => log.crewMemberId === input.crewMemberId);
  if (alreadyOpen) {
    throw new AppError("validation", "member already has an open timer");
  }

  const log = timeLogSchema.parse({
    ...newEntityBase(uid),
    jobId: input.jobId,
    crewMemberId: input.crewMemberId,
    crewName: input.crewName,
    clockIn: Timestamp.now(),
    clockOut: null,
    breakMinutes: 0,
    note: "",
    gps: input.gps,
  });
  commitWrite(setDoc(doc(db, COLLECTIONS.timeLogs, log.id), log), {
    collection: COLLECTIONS.timeLogs,
    docId: log.id,
    op: "set",
  });
  return log;
}

/** Fecha o timer: clockOut > clockIn, teto de 24h (rules rejeitam acima). */
export function clockOut(log: TimeLog): Promise<TimeLog> {
  const closed = timeLogSchema.parse({
    ...log,
    clockOut: Timestamp.fromMillis(clampClockOut(log.clockIn, Date.now())),
    updatedAt: Timestamp.now(),
  });
  commitWrite(setDoc(doc(db, COLLECTIONS.timeLogs, closed.id), closed), {
    collection: COLLECTIONS.timeLogs,
    docId: closed.id,
    op: "set",
  });
  return Promise.resolve(closed);
}

/** Timers abertos do dono (todos os membros) — header do /field. */
export function subscribeToOpenLogs(uid: string, onChange: (logs: TimeLog[]) => void): () => void {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.timeLogs).withConverter(converter),
      where("ownerId", "==", uid),
      where("clockOut", "==", null),
    ),
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => docSnap.data()).filter(isNotNull));
    },
    () => {
      onChange([]);
    },
  );
}

/** Logs de um job (tab Time do detail) em tempo real. */
export function subscribeToJobLogs(
  uid: string,
  jobId: string,
  onChange: (logs: TimeLog[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.timeLogs).withConverter(converter),
      where("ownerId", "==", uid),
      where("jobId", "==", jobId),
    ),
    (snapshot) => {
      const logs = snapshot.docs
        .map((docSnap) => docSnap.data())
        .filter(isNotNull)
        .sort((a, b) => b.clockIn.toMillis() - a.clockIn.toMillis());
      onChange(logs);
    },
    () => {
      onChange([]);
    },
  );
}

/** Últimos logs (página /field). Índice: ownerId + clockIn desc. */
export function subscribeToRecentLogs(
  uid: string,
  onChange: (logs: TimeLog[]) => void,
  count = 8,
): () => void {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.timeLogs).withConverter(converter),
      where("ownerId", "==", uid),
      orderBy("clockIn", "desc"),
      limit(count),
    ),
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => docSnap.data()).filter(isNotNull));
    },
    () => {
      onChange([]);
    },
  );
}

export function deleteTimeLog(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.timeLogs, id)), {
    collection: COLLECTIONS.timeLogs,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

/** GPS com falha silenciosa (SPEC §8): negado/timeout → null. */
export function captureGps(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 5_000, maximumAge: 60_000 },
    );
  });
}
