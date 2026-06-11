"use client";

import { BookOpen, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import { centsToDollarsString, dollarsToCents, formatCents } from "@/lib/utils";

import { usePricebook, usePricebookMutations } from "../hooks/use-pricebook";
import type { PricebookItem } from "../schemas";

interface DraftItem {
  name: string;
  category: string;
  unit: string;
  unitPrice: string;
  unitCost: string;
  description: string;
}

function toDraft(item: PricebookItem | undefined): DraftItem {
  return {
    name: item?.name ?? "",
    category: item?.category ?? "",
    unit: item?.unit ?? "",
    unitPrice: item ? centsToDollarsString(item.unitPriceCents) : "0.00",
    unitCost: item ? centsToDollarsString(item.unitCostCents) : "0.00",
    description: item?.description ?? "",
  };
}

export function PricebookList() {
  const dict = useTranslation();
  const fields = dict.pricebook.fields;
  const { data: items, isLoading } = usePricebook();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PricebookItem | undefined>(undefined);
  const [draft, setDraft] = useState<DraftItem>(toDraft(undefined));
  const { create, update, remove, undoRemove } = usePricebookMutations({
    onDone: () => {
      setFormOpen(false);
    },
  });

  function openForm(item: PricebookItem | undefined) {
    setEditing(item);
    setDraft(toDraft(item));
    setFormOpen(true);
  }

  function handleSave() {
    const unitPriceCents = dollarsToCents(draft.unitPrice);
    const unitCostCents = dollarsToCents(draft.unitCost);
    if (!draft.name.trim() || unitPriceCents === null || unitCostCents === null) {
      toast.error(dict.errors.validation);
      return;
    }
    const values = {
      name: draft.name.trim(),
      category: draft.category,
      unit: draft.unit,
      unitPriceCents,
      unitCostCents,
      description: draft.description,
    };
    const mutation = editing
      ? update.mutateAsync({ current: editing, values })
      : create.mutateAsync(values);
    mutation.catch(() => toast.error(dict.errors.unknown));
  }

  function handleDelete(item: PricebookItem) {
    remove.mutate(item, {
      onSuccess: () => {
        toast(dict.pricebook.deletedToast, {
          duration: 5000,
          action: {
            label: dict.common.undo,
            onClick: () => {
              undoRemove.mutate(item);
            },
          },
        });
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  const pending = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.pricebook.title}</h1>
        <Button
          className="ml-auto"
          onClick={() => {
            openForm(undefined);
          }}
        >
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {dict.pricebook.new}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <BookOpen className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.pricebook.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.pricebook.emptyCta}</p>
          <Button
            onClick={() => {
              openForm(undefined);
            }}
          >
            {dict.pricebook.new}
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[item.category, item.unit].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-sm tabular-nums">{formatCents(item.unitPriceCents)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={dict.common.edit}>
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      openForm(item);
                    }}
                  >
                    {dict.common.edit}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => {
                      handleDelete(item);
                    }}
                  >
                    {dict.common.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? dict.pricebook.edit : dict.pricebook.new}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pb-name">{fields.name}</Label>
              <Input
                id="pb-name"
                value={draft.name}
                onChange={(event) => {
                  setDraft({ ...draft, name: event.target.value });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pb-category">{fields.category}</Label>
                <Input
                  id="pb-category"
                  value={draft.category}
                  onChange={(event) => {
                    setDraft({ ...draft, category: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pb-unit">{fields.unit}</Label>
                <Input
                  id="pb-unit"
                  value={draft.unit}
                  onChange={(event) => {
                    setDraft({ ...draft, unit: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pb-price">{fields.unitPrice}</Label>
                <Input
                  id="pb-price"
                  inputMode="decimal"
                  value={draft.unitPrice}
                  onChange={(event) => {
                    setDraft({ ...draft, unitPrice: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pb-cost">{fields.unitCost}</Label>
                <Input
                  id="pb-cost"
                  inputMode="decimal"
                  value={draft.unitCost}
                  onChange={(event) => {
                    setDraft({ ...draft, unitCost: event.target.value });
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-description">{fields.description}</Label>
              <Input
                id="pb-description"
                value={draft.description}
                onChange={(event) => {
                  setDraft({ ...draft, description: event.target.value });
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setFormOpen(false);
                }}
              >
                {dict.common.cancel}
              </Button>
              <Button disabled={pending} onClick={handleSave}>
                {pending ? dict.common.loading : dict.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
