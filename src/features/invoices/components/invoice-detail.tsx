"use client";

import { Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type CompanyInfo } from "@/components/shared/document-pdf";
import {
  LineItemsEditor,
  parseLineItemDrafts,
  parseableLines,
  toLineItemDrafts,
  type LineItemDraft,
} from "@/components/shared/line-items-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { computeDocumentTotals } from "@/lib/totals";
import { formatCents } from "@/lib/utils";

import { useInvoice, useInvoiceMutations } from "../hooks/use-invoices";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceStatusBadge } from "./invoice-status-badge";

interface InvoiceDetailProps {
  id: string;
  company: CompanyInfo;
  /** email do cliente para o mailto, resolvido pela página */
  clientEmail: string | null;
}

export function InvoiceDetail({ id, company, clientEmail }: InvoiceDetailProps) {
  const dict = useTranslation();
  const { invoice, loading } = useInvoice(id);
  const { update } = useInvoiceMutations();

  const [dueDate, setDueDate] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [drafts, setDrafts] = useState<LineItemDraft[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice || invoice.id === loadedId) return;
    setDueDate(invoice.dueDate.toDate().toISOString().slice(0, 10));
    setDiscountPct(String(invoice.discountPct));
    setTaxPct(String(invoice.taxPct));
    setNotes(invoice.notes);
    setDrafts(toLineItemDrafts(invoice.lineItems));
    setLoadedId(invoice.id);
  }, [invoice, loadedId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!invoice) {
    return <p className="p-6 text-center text-muted-foreground">{dict.invoices.notFound}</p>;
  }

  const totals = computeDocumentTotals(
    parseableLines(drafts),
    Number(discountPct) || 0,
    Number(taxPct) || 0,
  );
  const editable = invoice.status === "draft" || invoice.status === "sent";

  function handleSave(current: NonNullable<typeof invoice>) {
    const lineItems = parseLineItemDrafts(drafts);
    const discount = Number(discountPct);
    const tax = Number(taxPct);
    if (!lineItems || !dueDate || !Number.isFinite(discount) || !Number.isFinite(tax)) {
      toast.error(dict.errors.validation);
      return;
    }
    update.mutate(
      {
        current,
        values: {
          dueDate: Timestamp.fromDate(new Date(`${dueDate}T12:00:00`)),
          discountPct: discount,
          taxPct: tax,
          notes,
          lineItems,
        },
      },
      {
        onSuccess: () => toast.success(dict.documents.savedToast),
        onError: () => toast.error(dict.errors.validation),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{invoice.number}</h1>
        <InvoiceStatusBadge status={invoice.status} />
        <span className="text-sm text-muted-foreground">{invoice.clientName || "—"}</span>
        {editable && (
          <Button
            className="ml-auto"
            disabled={update.isPending}
            onClick={() => {
              handleSave(invoice);
            }}
          >
            {update.isPending ? dict.common.loading : dict.common.save}
          </Button>
        )}
      </div>

      <InvoiceActions invoice={invoice} company={company} clientEmail={clientEmail} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="inv-due">{dict.invoices.fields.dueDate}</Label>
          <Input
            id="inv-due"
            type="date"
            value={dueDate}
            disabled={!editable}
            onChange={(event) => {
              setDueDate(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-discount">{dict.documents.discountPct}</Label>
          <Input
            id="inv-discount"
            inputMode="decimal"
            value={discountPct}
            disabled={!editable}
            onChange={(event) => {
              setDiscountPct(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-tax">{dict.documents.taxPct}</Label>
          <Input
            id="inv-tax"
            inputMode="decimal"
            value={taxPct}
            disabled={!editable}
            onChange={(event) => {
              setTaxPct(event.target.value);
            }}
          />
        </div>
      </div>

      {editable ? (
        <LineItemsEditor items={drafts} onChange={setDrafts} />
      ) : (
        <ul className="divide-y rounded-lg border">
          {invoice.lineItems.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 p-3 text-sm">
              <span>{item.description}</span>
              <span className="tabular-nums text-muted-foreground">
                {item.qty} × {formatCents(item.unitPriceCents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <section className="ml-auto w-full max-w-xs space-y-1 rounded-lg border p-4 text-sm">
        <p className="flex justify-between">
          <span className="text-muted-foreground">{dict.documents.subtotal}</span>
          <span className="tabular-nums">{formatCents(totals.subtotalCents)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">{dict.documents.discount}</span>
          <span className="tabular-nums">−{formatCents(totals.discountCents)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">{dict.documents.tax}</span>
          <span className="tabular-nums">{formatCents(totals.taxCents)}</span>
        </p>
        <p className="flex justify-between border-t pt-1 font-semibold">
          <span>{dict.documents.total}</span>
          <span className="tabular-nums">{formatCents(totals.totalCents)}</span>
        </p>
      </section>

      <div className="space-y-1.5">
        <Label htmlFor="inv-notes">{dict.documents.notes}</Label>
        <Textarea
          id="inv-notes"
          rows={3}
          value={notes}
          disabled={!editable}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />
      </div>
    </div>
  );
}
