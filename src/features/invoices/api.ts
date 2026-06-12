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
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { AppError } from "@/lib/errors";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { createConverter, isNotNull } from "@/lib/firestore/converter";
import { newEntityBase } from "@/lib/firestore/schema-helpers";
import { commitWrite } from "@/lib/firestore/write";

import { invoiceSchema, type Invoice } from "./schemas";
import { computeInvoiceTotals, effectiveInvoiceStatus } from "./utils";

export const PAGE_SIZE = 25;

const converter = createConverter(COLLECTIONS.invoices, invoiceSchema);

export type PageCursor = QueryDocumentSnapshot<unknown>;

export interface InvoicesPage {
  items: Invoice[];
  cursor: PageCursor | null;
}

/** Auto-marca overdue na leitura (SPEC §5) e persiste em background. */
function withEffectiveStatus(invoice: Invoice): Invoice {
  const effective = effectiveInvoiceStatus(invoice, Date.now());
  if (effective === invoice.status) return invoice;
  const updated = invoiceSchema.parse({
    ...invoice,
    status: effective,
    updatedAt: Timestamp.now(),
  });
  commitWrite(setDoc(doc(db, COLLECTIONS.invoices, updated.id), updated), {
    collection: COLLECTIONS.invoices,
    docId: updated.id,
    op: "set",
  });
  return updated;
}

export async function fetchInvoicesPage(
  uid: string,
  cursor: PageCursor | null,
): Promise<InvoicesPage> {
  const constraints = [
    where("ownerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.invoices).withConverter(converter), ...constraints),
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

export function subscribeToInvoice(
  id: string,
  onChange: (invoice: Invoice | null) => void,
): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.invoices, id).withConverter(converter),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      onChange(data ? withEffectiveStatus(data) : null);
    },
    () => {
      onChange(null);
    },
  );
}

/** Shape estrutural do job — sem importar a feature jobs (ADR-013). */
export interface ConvertibleJob {
  id: string;
  name: string;
  status: string;
  clientId: string | null;
  clientName: string;
  valueCents: number;
  depositCents: number;
  paidCents: number;
  invoiceId: string | null;
  notes: string;
}

/**
 * Job → Invoice em transação atômica (SPEC §5): número do contador
 * transacional (settings.invoicePrefix + invoiceCounter), line item com o
 * valor do job, job → invoiced com vínculo invoiceId.
 */
export async function createInvoiceFromJob(
  uid: string,
  job: ConvertibleJob,
  taxPctDefault: number,
  invoicePrefix: string,
): Promise<string> {
  if (job.invoiceId) throw new AppError("validation", "job already invoiced");
  if (job.status !== "completed") throw new AppError("validation", "job must be completed");

  const invoiceId = crypto.randomUUID();
  const now = Timestamp.now();

  await runTransaction(db, async (transaction) => {
    const settingsRef = doc(db, COLLECTIONS.settings, uid);
    const settingsSnap = await transaction.get(settingsRef);
    const counter = (settingsSnap.get("invoiceCounter") as number | undefined) ?? 1;
    const number = `${invoicePrefix}${String(counter).padStart(4, "0")}`;

    const invoice = invoiceSchema.parse({
      ...newEntityBase(uid),
      id: invoiceId,
      createdAt: now,
      updatedAt: now,
      number,
      jobId: job.id,
      clientId: job.clientId,
      clientName: job.clientName,
      lineItems: [
        {
          id: crypto.randomUUID(),
          description: job.name,
          qty: 1,
          unitPriceCents: job.valueCents,
        },
      ],
      discountPct: 0,
      taxPct: taxPctDefault,
      notes: job.notes,
      status: "draft",
      dueDate: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
      paidAt: null,
      paidCents: job.paidCents + job.depositCents,
    });

    transaction.update(settingsRef, { invoiceCounter: counter + 1 });
    transaction.set(doc(db, COLLECTIONS.invoices, invoiceId), invoice);
    transaction.update(doc(db, COLLECTIONS.jobs, job.id), {
      status: "invoiced",
      invoiceId,
      updatedAt: now,
    });
  });

  return invoiceId;
}

export function updateInvoice(
  current: Invoice,
  values: Partial<Omit<Invoice, "id" | "ownerId" | "createdAt" | "schemaVersion">>,
): Promise<Invoice> {
  const updated = invoiceSchema.parse({ ...current, ...values, updatedAt: Timestamp.now() });
  commitWrite(setDoc(doc(db, COLLECTIONS.invoices, updated.id), updated), {
    collection: COLLECTIONS.invoices,
    docId: updated.id,
    op: "set",
  });
  return Promise.resolve(updated);
}

export function markInvoiceSent(invoice: Invoice): Promise<Invoice> {
  return updateInvoice(invoice, { status: "sent" });
}

/**
 * Mark Paid: quita o total derivado e registra paidAt; sincroniza o job
 * vinculado (paymentStatus/paidCents/paidAt) — fecha a pendência do
 * ADR-019 e alimenta os KPIs do dashboard.
 */
export function markInvoicePaid(invoice: Invoice): Promise<Invoice> {
  const now = Timestamp.now();
  const totalCents = computeInvoiceTotals(invoice).totalCents;

  commitWrite(
    updateDoc(doc(db, COLLECTIONS.jobs, invoice.jobId), {
      paymentStatus: "paid",
      paidCents: totalCents,
      paidAt: now,
      updatedAt: now,
    }),
    { collection: COLLECTIONS.jobs, docId: invoice.jobId, op: "set" },
  );

  return updateInvoice(invoice, {
    status: "paid",
    paidAt: now,
    paidCents: totalCents,
  });
}

/** Para dashboard/analytics — escala da persona permite fetch único (ADR-011). */
export async function fetchAllInvoices(uid: string): Promise<Invoice[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.invoices).withConverter(converter),
      where("ownerId", "==", uid),
    ),
  );
  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isNotNull)
    .map(withEffectiveStatus);
}

export function voidInvoice(invoice: Invoice): Promise<Invoice> {
  return updateInvoice(invoice, { status: "void" });
}

export function deleteInvoice(id: string): Promise<void> {
  commitWrite(deleteDoc(doc(db, COLLECTIONS.invoices, id)), {
    collection: COLLECTIONS.invoices,
    docId: id,
    op: "delete",
  });
  return Promise.resolve();
}

export function restoreInvoice(invoice: Invoice): Promise<void> {
  commitWrite(setDoc(doc(db, COLLECTIONS.invoices, invoice.id), invoiceSchema.parse(invoice)), {
    collection: COLLECTIONS.invoices,
    docId: invoice.id,
    op: "set",
  });
  return Promise.resolve();
}
