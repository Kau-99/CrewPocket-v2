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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { computeDocumentTotals } from "@/lib/totals";
import { formatCents } from "@/lib/utils";

import { useEstimate, useEstimateMutations } from "../hooks/use-estimates";
import { EstimateActions } from "./estimate-actions";
import { EstimateStatusBadge } from "./estimate-status-badge";

export interface ClientOption {
  id: string;
  name: string;
  email: string;
}

interface EstimateDetailProps {
  id: string;
  clientOptions: ClientOption[];
  company: CompanyInfo;
}

const NO_CLIENT = "none";

export function EstimateDetail({ id, clientOptions, company }: EstimateDetailProps) {
  const dict = useTranslation();
  const { estimate, loading } = useEstimate(id);
  const { update } = useEstimateMutations();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(NO_CLIENT);
  const [validUntil, setValidUntil] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [drafts, setDrafts] = useState<LineItemDraft[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // inicializa o form uma vez por estimate (snapshots do próprio save não clobberam edição)
  useEffect(() => {
    if (!estimate || estimate.id === loadedId) return;
    setTitle(estimate.title);
    setClientId(estimate.clientId ?? NO_CLIENT);
    setValidUntil(estimate.validUntil.toDate().toISOString().slice(0, 10));
    setDiscountPct(String(estimate.discountPct));
    setTaxPct(String(estimate.taxPct));
    setNotes(estimate.notes);
    setDrafts(toLineItemDrafts(estimate.lineItems));
    setLoadedId(estimate.id);
  }, [estimate, loadedId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!estimate) {
    return <p className="p-6 text-center text-muted-foreground">{dict.estimates.notFound}</p>;
  }

  const totals = computeDocumentTotals(
    parseableLines(drafts),
    Number(discountPct) || 0,
    Number(taxPct) || 0,
  );
  const clientEmail =
    clientOptions.find((option) => option.id === estimate.clientId)?.email ?? null;

  function handleSave(current: NonNullable<typeof estimate>) {
    const lineItems = parseLineItemDrafts(drafts);
    const discount = Number(discountPct);
    const tax = Number(taxPct);
    if (
      !lineItems ||
      !title.trim() ||
      !validUntil ||
      !Number.isFinite(discount) ||
      !Number.isFinite(tax)
    ) {
      toast.error(dict.errors.validation);
      return;
    }
    update.mutate(
      {
        current,
        values: {
          title: title.trim(),
          clientId: clientId === NO_CLIENT ? null : clientId,
          clientName:
            clientId === NO_CLIENT
              ? ""
              : (clientOptions.find((option) => option.id === clientId)?.name ?? ""),
          validUntil: Timestamp.fromDate(new Date(`${validUntil}T12:00:00`)),
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
        <h1 className="text-2xl font-semibold">{estimate.number}</h1>
        <EstimateStatusBadge status={estimate.status} />
        <Button
          className="ml-auto"
          disabled={update.isPending}
          onClick={() => {
            handleSave(estimate);
          }}
        >
          {update.isPending ? dict.common.loading : dict.common.save}
        </Button>
      </div>

      <EstimateActions estimate={estimate} company={company} clientEmail={clientEmail} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="est-title">{dict.estimates.fields.docTitle}</Label>
          <Input
            id="est-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{dict.documents.client}</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger aria-label={dict.documents.client}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLIENT}>{dict.documents.noClient}</SelectItem>
              {clientOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="est-valid">{dict.estimates.fields.validUntil}</Label>
          <Input
            id="est-valid"
            type="date"
            value={validUntil}
            onChange={(event) => {
              setValidUntil(event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="est-discount">{dict.documents.discountPct}</Label>
            <Input
              id="est-discount"
              inputMode="decimal"
              value={discountPct}
              onChange={(event) => {
                setDiscountPct(event.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="est-tax">{dict.documents.taxPct}</Label>
            <Input
              id="est-tax"
              inputMode="decimal"
              value={taxPct}
              onChange={(event) => {
                setTaxPct(event.target.value);
              }}
            />
          </div>
        </div>
      </div>

      <LineItemsEditor items={drafts} onChange={setDrafts} />

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
        <Label htmlFor="est-notes">{dict.documents.notes}</Label>
        <Textarea
          id="est-notes"
          rows={3}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />
      </div>
    </div>
  );
}
