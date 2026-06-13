"use client";

import { FileText, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

import {
  useEstimateMutations,
  useEstimates,
  useEstimateTemplates,
  useTemplateMutations,
} from "../hooks/use-estimates";
import { computeEstimateTotals } from "../utils";
import { EstimateStatusBadge } from "./estimate-status-badge";

export interface ClientOption {
  id: string;
  name: string;
}

interface EstimatesListProps {
  clientOptions: ClientOption[];
  /** settings.taxPctDefault — aplicado em estimates novos. */
  taxPctDefault: number;
}

const NO_CLIENT = "none";

export function EstimatesList({ clientOptions, taxPctDefault }: EstimatesListProps) {
  const dict = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClientId, setNewClientId] = useState(NO_CLIENT);
  const [templateOpen, setTemplateOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useEstimates();
  const { data: templateList } = useEstimateTemplates();
  const { remove: removeTemplate } = useTemplateMutations();
  useNewShortcut(() => {
    setNewOpen(true);
  });
  const { create } = useEstimateMutations({
    onCreated: (estimate) => {
      router.push(`/estimates/${estimate.id}`);
    },
  });

  function createFromTemplate(templateId: string) {
    const template = (templateList ?? []).find((item) => item.id === templateId);
    if (!template) return;
    create.mutate(
      {
        title: template.title || template.name,
        clientId: null,
        clientName: "",
        taxPct: template.taxPct,
        discountPct: template.discountPct,
        notes: template.notes,
        terms: template.terms,
        lineItems: template.lineItems.map((item) => ({ ...item, id: crypto.randomUUID() })),
      },
      { onError: () => toast.error(dict.errors.offline) },
    );
  }

  const all = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const visible = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return all.filter(
      (estimate) =>
        term === "" ||
        estimate.title.toLowerCase().includes(term) ||
        estimate.number.toLowerCase().includes(term) ||
        estimate.clientName.toLowerCase().includes(term),
    );
  }, [all, debouncedSearch]);

  function handleCreate() {
    if (!newTitle.trim()) {
      toast.error(dict.forms.required);
      return;
    }
    create.mutate(
      {
        title: newTitle.trim(),
        clientId: newClientId === NO_CLIENT ? null : newClientId,
        clientName:
          newClientId === NO_CLIENT
            ? ""
            : (clientOptions.find((option) => option.id === newClientId)?.name ?? ""),
        taxPct: taxPctDefault,
        lineItems: [
          {
            id: crypto.randomUUID(),
            description: dict.estimates.defaultLineItem,
            qty: 1,
            unitPriceCents: 0,
            unit: "",
            note: "",
          },
        ],
      },
      {
        // contador é transacional → exige rede (ADR-018)
        onError: () => toast.error(dict.errors.offline),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.estimates.title}</h1>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTemplateOpen(true);
            }}
          >
            <LayoutTemplate className="mr-1 size-4" aria-hidden="true" />
            {dict.estimates.templates.newFrom}
          </Button>
          <Button
            onClick={() => {
              setNewOpen(true);
            }}
          >
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {dict.estimates.new}
          </Button>
        </div>
      </div>

      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
        }}
        placeholder={dict.estimates.search}
        className="max-w-xs"
        aria-label={dict.estimates.search}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <FileText className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.estimates.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.estimates.emptyCta}</p>
          <Button
            onClick={() => {
              setNewOpen(true);
            }}
          >
            {dict.estimates.new}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{dict.common.noResults}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((estimate) => (
            <li key={estimate.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/estimates/${estimate.id}`} className="font-medium hover:underline">
                  {estimate.number} · {estimate.title}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {estimate.clientName || "—"}
                </p>
              </div>
              <span className="text-sm tabular-nums">
                {formatCents(computeEstimateTotals(estimate).totalCents)}
              </span>
              <EstimateStatusBadge status={estimate.status} />
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? dict.common.loading : dict.common.loadMore}
          </Button>
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.estimates.new}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-est-title">{dict.estimates.fields.docTitle}</Label>
              <Input
                id="new-est-title"
                value={newTitle}
                placeholder={dict.estimates.newTitlePlaceholder}
                onChange={(event) => {
                  setNewTitle(event.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{dict.documents.client}</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
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
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setNewOpen(false);
                }}
              >
                {dict.common.cancel}
              </Button>
              <Button disabled={create.isPending} onClick={handleCreate}>
                {create.isPending ? dict.common.loading : dict.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.estimates.templates.pick}</DialogTitle>
          </DialogHeader>
          {(templateList ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {dict.estimates.templates.none}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {(templateList ?? []).map((template) => (
                <li key={template.id} className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left hover:underline"
                    disabled={create.isPending}
                    onClick={() => {
                      setTemplateOpen(false);
                      createFromTemplate(template.id);
                    }}
                  >
                    <span className="font-medium">{template.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {template.lineItems.length} · {template.title || "—"}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={dict.common.delete}
                    onClick={() => {
                      removeTemplate.mutate(template.id, {
                        onSuccess: () => toast.success(dict.estimates.templates.deletedToast),
                        onError: () => toast.error(dict.errors.unknown),
                      });
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
