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
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { AppError } from "@/lib/errors";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { commitWrite } from "@/lib/firestore/write";
import { newEntityBase } from "@/lib/firestore/schema-helpers";

import { jobSchema, type CostItem, type Job, type JobFormValues, type JobStatus } from "./schemas";
import { canTransition } from "./utils";

export const PAGE_SIZE = 25;

const converter = createConverter(COLLECTIONS.jobs, jobSchema);

/** Covariante em unknown: o converter tipa os snapshots como T | null. */
export type PageCursor = QueryDocumentSnapshot<unknown>;

export interface JobsPage {
  items: Job[];
  cursor: PageCursor | null;
}

export async function fetchJobsPage(uid: string, cursor: PageCursor | null): Promise<JobsPage> {
  const constraints = [
    where("ownerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.jobs).withConverter(converter), ...constraints),
  );
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return {
    items: snapshot.docs.map((docSnap) => docSnap.data()).filter(isNotNull),
    cursor: snapshot.docs.length === PAGE_SIZE && lastDoc ? lastDoc : null,
  };
}

/** Para dashboard/analytics — escala da persona permite fetch único (ADR-011). */
export async function fetchAllJobs(uid: string): Promise<Job[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.jobs).withConverter(converter), where("ownerId", "==", uid)),
  );
  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isNotNull)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function fetchJobsByClient(uid: string, clientId: string): Promise<Job[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.jobs).withConverter(converter),
      where("ownerId", "==", uid),
      where("clientId", "==", clientId),
    ),
  );
  return snapshot.docs.map((docSnap) => docSnap.data()).filter(isNotNull);
}

/** Detalhe em tempo real (custos editados refletem na hora; offline-first). */
export function subscribeToJob(id: string, onChange: (job: Job | null) => void): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.jobs, id).withConverter(converter),
    (snapshot) => {
      onChange(snapshot.exists() ? snapshot.data() : null);
    },
    () => {
      onChange(null);
    },
  );
}

export function createJob(uid: string, values: JobFormValues): Promise<Job> {
  const job = jobSchema.parse({
    ...newEntityBase(uid),
    ...values,
    date: Timestamp.fromDate(values.date),
    deadline: values.deadline ? Timestamp.fromDate(values.deadline) : null,
    status: "lead",
    paymentStatus: "unpaid",
    costs: [],
    paidCents: 0,
    paidAt: null,
    photoUrls: [],
    estimateId: null,
    invoiceId: null,
  });
  commitWrite(setDoc(doc(db, COLLECTIONS.jobs, job.id), job), {
    collection: COLLECTIONS.jobs,
    docId: job.id,
    op: "set",
  });
  return Promise.resolve(job);
}

export function updateJob(
  current: Job,
  values: Partial<Omit<Job, "id" | "ownerId" | "createdAt" | "schemaVersion">>,
): Promise<Job> {
  const updated = jobSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.jobs, updated.id), updated), {
    collection: COLLECTIONS.jobs,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function applyJobForm(current: Job, values: JobFormValues): Promise<Job> {
  return updateJob(current, {
    ...values,
    date: Timestamp.fromDate(values.date),
    deadline: values.deadline ? Timestamp.fromDate(values.deadline) : null,
  });
}

/** Transições validadas pela máquina de estados (SPEC §4.2) — UI e rules. */
export function changeJobStatus(job: Job, to: JobStatus): Promise<Job> {
  if (!canTransition(job.status, to)) {
    return Promise.reject(new AppError("validation", `invalid transition ${job.status} → ${to}`));
  }
  return updateJob(job, { status: to });
}

export function updateJobCosts(job: Job, costs: CostItem[]): Promise<Job> {
  return updateJob(job, { costs });
}

export function deleteJob(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.jobs, id)), {
    collection: COLLECTIONS.jobs,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restoreJob(job: Job): Promise<void> {
  commitWrite(setDoc(doc(db, COLLECTIONS.jobs, job.id), jobSchema.parse(job)), {
    collection: COLLECTIONS.jobs,
    docId: job.id,
    op: "set",
  });
  return Promise.resolve();
}
