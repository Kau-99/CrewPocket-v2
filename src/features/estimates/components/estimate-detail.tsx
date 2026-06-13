"use client";

import { Timestamp } from "firebase/firestore";
import { Save, Trash2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

import { useEstimate, useEstimateMutations, useTemplateMutations } from "../hooks/use-estimates";
import { depositDueCents, type DepositType } from "../schemas";
import { EstimateActions } from "./estimate-actions";
import { EstimateStatusBadge } from "./estimate-status-badge";
import { SignaturePad } from "./signature-pad";

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
  const docs = dict.documents;
  const { estimate, loading } = useEstimate(id);
  const { update } = useEstimateMutations();
  const templates = useTemplateMutations();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(NO_CLIENT);
  const [validUntil, setValidUntil] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [depositType, setDepositType] = useState<DepositType>("none");
  const [depositValue, setDepositValue] = useState("0");
  const [drafts, setDrafts] = useState<LineItemDraft[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // inicializa o form uma vez por estimate (snapshots do próprio save não clobberam edição)
  useEffect(() => {
    if (!estimate || estimate.id === loadedId) return;
    setTitle(estimate.title);
    setClientId(estimate.clientId ?? NO_CLIENT);
    setValidUntil(estimate.validUntil.toDate().toISOString().slice(0, 10));
    setDiscountPct(String(estimate.discountPct));
    setTaxPct(String(estimate.taxPct));
    setNotes(estimate.notes);
    setTerms(estimate.terms);
    setDepositType(estimate.depositType);
    // depósito fixo é exibido em dólares; percent em pontos
    setDepositValue(
      estimate.depositType === "fixed"
        ? (estimate.depositValue / 100).toFixed(2)
        : String(estimate.depositValue),
    );
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
  // narrow estável p/ os closures (handleSign/clearSignature/saveAsTemplate)
  const est = estimate;

  const totals = computeDocumentTotals(
    parseableLines(drafts),
    Number(discountPct) || 0,
    Number(taxPct) || 0,
  );
  // valor do depósito normalizado: fixo em centavos, percent em pontos
  const depositValueNormalized =
    depositType === "fixed"
      ? Math.round((Number(depositValue) || 0) * 100)
      : Number(depositValue) || 0;
  const depositCents = depositDueCents(depositType, depositValueNormalized, totals.totalCents);
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
          terms,
          depositType,
          depositValue: depositValueNormalized,
          lineItems,
        },
      },
      {
        onSuccess: () => toast.success(docs.savedToast),
        onError: () => toast.error(dict.errors.validation),
      },
    );
  }

  function handleSign(dataUrl: string, name: string) {
    update.mutate(
      {
        current: est,
        values: { signatureDataUrl: dataUrl, signedName: name, signedAt: Timestamp.now() },
      },
      { onError: () => toast.error(dict.errors.unknown) },
    );
  }

  function clearSignature() {
    update.mutate(
      {
        current: est,
        values: { signatureDataUrl: "", signedName: "", signedAt: null },
      },
      { onError: () => toast.error(dict.errors.unknown) },
    );
  }

  function saveAsTemplate() {
    const lineItems = parseLineItemDrafts(drafts);
    if (!templateName.trim() || !lineItems) {
      toast.error(dict.errors.validation);
      return;
    }
    templates.create.mutate(
      {
        name: templateName.trim(),
        title: title.trim(),
        lineItems,
        discountPct: Number(discountPct) || 0,
        taxPct: Number(taxPct) || 0,
        notes,
        terms,
      },
      {
        onSuccess: () => {
          toast.success(dict.estimates.templates.savedToast);
          setTemplateOpen(false);
          setTemplateName("");
        },
        onError: () => toast.error(dict.errors.unknown),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{estimate.number}</h1>
        <EstimateStatusBadge status={estimate.status} />
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTemplateOpen(true);
            }}
          >
            {dict.estimates.templates.saveAs}
          </Button>
          <Button
            disabled={update.isPending}
            onClick={() => {
              handleSave(estimate);
            }}
          >
            <Save className="mr-1 size-4" aria-hidden="true" />
            {update.isPending ? dict.common.loading : dict.common.save}
          </Button>
        </div>
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
          <Label>{docs.client}</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger aria-label={docs.client}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLIENT}>{docs.noClient}</SelectItem>
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
            <Label htmlFor="est-discount">{docs.discountPct}</Label>
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
            <Label htmlFor="est-tax">{docs.taxPct}</Label>
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
          <span className="text-muted-foreground">{docs.subtotal}</span>
          <span className="tabular-nums">{formatCents(totals.subtotalCents)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">{docs.discount}</span>
          <span className="tabular-nums">−{formatCents(totals.discountCents)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">{docs.tax}</span>
          <span className="tabular-nums">{formatCents(totals.taxCents)}</span>
        </p>
        <p className="flex justify-between border-t pt-1 font-semibold">
          <span>{docs.total}</span>
          <span className="tabular-nums">{formatCents(totals.totalCents)}</span>
        </p>
        {depositCents > 0 && (
          <p className="flex justify-between text-primary">
            <span>{docs.depositDue}</span>
            <span className="tabular-nums">{formatCents(depositCents)}</span>
          </p>
        )}
      </section>

      {/* Depósito */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{docs.depositType}</Label>
          <Select
            value={depositType}
            onValueChange={(value) => {
              setDepositType(value as DepositType);
            }}
          >
            <SelectTrigger aria-label={docs.depositType}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{docs.depositNone}</SelectItem>
              <SelectItem value="fixed">{docs.depositFixed}</SelectItem>
              <SelectItem value="percent">{docs.depositPercent}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {depositType !== "none" && (
          <div className="space-y-1.5">
            <Label htmlFor="est-deposit">{docs.deposit}</Label>
            <Input
              id="est-deposit"
              inputMode="decimal"
              value={depositValue}
              onChange={(event) => {
                setDepositValue(event.target.value);
              }}
            />
          </div>
        )}
      </div>

      {/* Termos */}
      <div className="space-y-1.5">
        <Label htmlFor="est-terms">{docs.terms}</Label>
        <Textarea
          id="est-terms"
          rows={3}
          value={terms}
          placeholder={docs.termsPlaceholder}
          onChange={(event) => {
            setTerms(event.target.value);
          }}
        />
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label htmlFor="est-notes">{docs.notes}</Label>
        <Textarea
          id="est-notes"
          rows={3}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />
      </div>

      {/* Assinatura do cliente */}
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">{dict.estimates.signature.title}</h2>
        {estimate.signatureDataUrl ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, sem domínio */}
            <img
              src={estimate.signatureDataUrl}
              alt={dict.estimates.signature.title}
              className="max-h-32 rounded border bg-white"
            />
            <p className="text-sm text-muted-foreground">
              {[estimate.signedName, estimate.signedAt?.toDate().toLocaleDateString()]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={update.isPending}
              onClick={clearSignature}
            >
              <Trash2 className="mr-1 size-4" aria-hidden="true" />
              {dict.estimates.signature.clearSaved}
            </Button>
          </div>
        ) : (
          <SignaturePad onSign={handleSign} pending={update.isPending} />
        )}
      </section>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.estimates.templates.saveAs}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">{dict.estimates.templates.nameLabel}</Label>
              <Input
                id="tpl-name"
                value={templateName}
                placeholder={dict.estimates.templates.namePlaceholder}
                onChange={(event) => {
                  setTemplateName(event.target.value);
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setTemplateOpen(false);
                }}
              >
                {dict.common.cancel}
              </Button>
              <Button disabled={templates.create.isPending} onClick={saveAsTemplate}>
                {templates.create.isPending ? dict.common.loading : dict.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
