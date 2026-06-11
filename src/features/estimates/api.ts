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
  runTransaction,
  setDoc,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { AppError } from "@/lib/errors";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { nextDocumentNumber } from "@/lib/firestore/counters";
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { newEntityBase } from "@/lib/firestore/schema-helpers";
import { commitWrite } from "@/lib/firestore/write";

import { estimateSchema, type Estimate, type LineItem } from "./schemas";
import { computeEstimateTotals, effectiveEstimateStatus } from "./utils";

export const PAGE_SIZE = 25;

const converter = createConverter(COLLECTIONS.estimates, estimateSchema);

export type PageCursor = QueryDocumentSnapshot<unknown>;

export interface EstimatesPage {
  items: Estimate[];
  cursor: PageCursor | null;
}

/** Auto-marca expired detectado na leitura (SPEC §5) e persiste em background. */
function withEffectiveStatus(estimate: Estimate): Estimate {
  const effective = effectiveEstimateStatus(estimate, Date.now());
  if (effective === estimate.status) return estimate;
  const updated = estimateSchema.parse({
    ...estimate,
    status: effective,
    updatedAt: Timestamp.now(),
  });
  commitWrite(setDoc(doc(db, COLLECTIONS.estimates, updated.id), updated), {
    collection: COLLECTIONS.estimates,
    docId: updated.id,
    op: "set",
  });
  return updated;
}

export async function fetchEstimatesPage(
  uid: string,
  cursor: PageCursor | null,
): Promise<EstimatesPage> {
  const constraints = [
    where("ownerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.estimates).withConverter(converter), ...constraints),
  );
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return {
    items: snapshot.docs
      .map((docSnap) => docSnap.data())
      .filter(isNotNull)
      .map(withEffectiveStatus),
    cursor: snapshot.docs.length === PAGE_SIZE && lastDoc ? lastDoc : null,
  };
}

export function subscribeToEstimate(
  id: string,
  onChange: (estimate: Estimate | null) => void,
): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.estimates, id).withConverter(converter),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      onChange(data ? withEffectiveStatus(data) : null);
    },
    () => {
      onChange(null);
    },
  );
}

export interface NewEstimateInput {
  title: string;
  clientId: string | null;
  clientName: string;
  taxPct: number;
  lineItems: LineItem[];
}

/** Criação numerada: contador transacional em settings (exige rede, ADR-018). */
export async function createEstimate(uid: string, input: NewEstimateInput): Promise<Estimate> {
  const number = await nextDocumentNumber(uid, "estimateCounter", "EST-");
  const estimate = estimateSchema.parse({
    ...newEntityBase(uid),
    number,
    clientId: input.clientId,
    clientName: input.clientName,
    title: input.title,
    status: "draft",
    lineItems: input.lineItems,
    discountPct: 0,
    taxPct: input.taxPct,
    notes: "",
    validUntil: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
    sentAt: null,
    acceptedAt: null,
    declinedAt: null,
    convertedJobId: null,
  });
  await setDoc(doc(db, COLLECTIONS.estimates, estimate.id), estimate);
  return estimate;
}

export function updateEstimate(
  current: Estimate,
  values: Partial<Omit<Estimate, "id" | "ownerId" | "createdAt" | "schemaVersion">>,
): Promise<Estimate> {
  const updated = estimateSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.estimates, updated.id), updated), {
    collection: COLLECTIONS.estimates,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function markEstimateSent(estimate: Estimate): Promise<Estimate> {
  return updateEstimate(estimate, { status: "sent", sentAt: Timestamp.now() });
}

export function markEstimateAccepted(estimate: Estimate): Promise<Estimate> {
  return updateEstimate(estimate, { status: "accepted", acceptedAt: Timestamp.now() });
}

export function markEstimateDeclined(estimate: Estimate): Promise<Estimate> {
  return updateEstimate(estimate, { status: "declined", declinedAt: Timestamp.now() });
}

export function deleteEstimate(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.estimates, id)), {
    collection: COLLECTIONS.estimates,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restoreEstimate(estimate: Estimate): Promise<void> {
  commitWrite(setDoc(doc(db, COLLECTIONS.estimates, estimate.id), estimateSchema.parse(estimate)), {
    collection: COLLECTIONS.estimates,
    docId: estimate.id,
    op: "set",
  });
  return Promise.resolve();
}

/**
 * Estimate → Job em transação atômica (SPEC §5): lineItems viram costs
 * (categoria material), valueCents = total, vincula estimateId/convertedJobId,
 * estimate → accepted. O shape do job espelha o jobSchema sem importar a
 * feature jobs (ilhas — ADR-013); as rules validam o doc na escrita.
 */
export async function convertEstimateToJob(uid: string, estimate: Estimate): Promise<string> {
  if (estimate.convertedJobId) {
    throw new AppError("validation", "estimate already converted");
  }
  const totals = computeEstimateTotals(estimate);
  const now = Timestamp.now();
  const jobId = crypto.randomUUID();

  const job = {
    id: jobId,
    ownerId: uid,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2 as const,
    name: estimate.title,
    clientId: estimate.clientId,
    clientName: estimate.clientName,
    status: "draft" as const,
    priority: "normal" as const,
    paymentStatus: "unpaid" as const,
    date: now,
    deadline: null,
    address: "",
    zip: "",
    description: "",
    notes: estimate.notes,
    tags: [] as string[],
    costs: estimate.lineItems.map((item) => ({
      id: crypto.randomUUID(),
      name: item.description,
      category: "material" as const,
      qty: item.qty,
      unitCostCents: item.unitPriceCents,
    })),
    valueCents: totals.totalCents,
    depositCents: 0,
    paidCents: 0,
    paidAt: null,
    photoUrls: [] as string[],
    estimateId: estimate.id,
    invoiceId: null,
  };

  const acceptedEstimate = estimateSchema.parse({
    ...estimate,
    status: "accepted",
    acceptedAt: now,
    convertedJobId: jobId,
    updatedAt: now,
  });

  await runTransaction(db, (transaction) => {
    transaction.set(doc(db, COLLECTIONS.jobs, jobId), job);
    transaction.set(doc(db, COLLECTIONS.estimates, estimate.id), acceptedEstimate);
    return Promise.resolve();
  });

  return jobId;
}
