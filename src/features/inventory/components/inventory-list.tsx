"use client";

import { MoreHorizontal, Package, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { centsToDollarsString, dollarsToCents } from "@/lib/utils";

import { useInventory, useInventoryMutations } from "../hooks/use-inventory";
import type { InventoryItem } from "../schemas";
import { isLowStock } from "../utils";

interface DraftItem {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  unitCost: string;
  supplier: string;
  minStock: string;
}

function toDraft(item: InventoryItem | undefined): DraftItem {
  return {
    name: item?.name ?? "",
    category: item?.category ?? "",
    quantity: item ? String(item.quantity) : "0",
    unit: item?.unit ?? "",
    unitCost: item ? centsToDollarsString(item.unitCostCents) : "0.00",
    supplier: item?.supplier ?? "",
    minStock: item ? String(item.minStock) : "0",
  };
}

export function InventoryList() {
  const dict = useTranslation();
  const fields = dict.inventory.fields;
  const { data: items, isLoading } = useInventory();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | undefined>(undefined);
  const [draft, setDraft] = useState<DraftItem>(toDraft(undefined));
  const { create, update, remove, undoRemove } = useInventoryMutations({
    onDone: () => {
      setFormOpen(false);
    },
  });

  function openForm(item: InventoryItem | undefined) {
    setEditing(item);
    setDraft(toDraft(item));
    setFormOpen(true);
  }

  function handleSave() {
    const quantity = Number(draft.quantity);
    const minStock = Number(draft.minStock);
    const unitCostCents = dollarsToCents(draft.unitCost);
    if (
      !draft.name.trim() ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      !Number.isFinite(minStock) ||
      minStock < 0 ||
      unitCostCents === null
    ) {
      toast.error(dict.errors.validation);
      return;
    }
    const values = {
      name: draft.name.trim(),
      category: draft.category,
      quantity,
      unit: draft.unit,
      unitCostCents,
      supplier: draft.supplier,
      minStock,
    };
    const mutation = editing
      ? update.mutateAsync({ current: editing, values })
      : create.mutateAsync(values);
    mutation.catch(() => toast.error(dict.errors.unknown));
  }

  function handleDelete(item: InventoryItem) {
    remove.mutate(item, {
      onSuccess: () => {
        toast(dict.inventory.deletedToast, {
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
        <h1 className="text-2xl font-semibold">{dict.inventory.title}</h1>
        <Button
          className="ml-auto"
          onClick={() => {
            openForm(undefined);
          }}
        >
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {dict.inventory.new}
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
          <Package className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.inventory.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.inventory.emptyCta}</p>
          <Button
            onClick={() => {
              openForm(undefined);
            }}
          >
            {dict.inventory.new}
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[item.category, item.supplier].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-sm tabular-nums">
                {item.quantity} {item.unit}
              </span>
              {isLowStock(item) && (
                <Badge variant="secondary" className="border-0 bg-red-500/15 text-red-400">
                  <TriangleAlert className="mr-1 size-3" aria-hidden="true" />
                  {dict.inventory.lowStock}
                </Badge>
              )}
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
            <DialogTitle>{editing ? dict.inventory.edit : dict.inventory.new}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">{fields.name}</Label>
              <Input
                id="inv-name"
                value={draft.name}
                onChange={(event) => {
                  setDraft({ ...draft, name: event.target.value });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-category">{fields.category}</Label>
                <Input
                  id="inv-category"
                  value={draft.category}
                  onChange={(event) => {
                    setDraft({ ...draft, category: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-supplier">{fields.supplier}</Label>
                <Input
                  id="inv-supplier"
                  value={draft.supplier}
                  onChange={(event) => {
                    setDraft({ ...draft, supplier: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-quantity">{fields.quantity}</Label>
                <Input
                  id="inv-quantity"
                  inputMode="decimal"
                  value={draft.quantity}
                  onChange={(event) => {
                    setDraft({ ...draft, quantity: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-unit">{fields.unit}</Label>
                <Input
                  id="inv-unit"
                  value={draft.unit}
                  onChange={(event) => {
                    setDraft({ ...draft, unit: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-cost">{fields.unitCost}</Label>
                <Input
                  id="inv-cost"
                  inputMode="decimal"
                  value={draft.unitCost}
                  onChange={(event) => {
                    setDraft({ ...draft, unitCost: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-min">{fields.minStock}</Label>
                <Input
                  id="inv-min"
                  inputMode="decimal"
                  value={draft.minStock}
                  onChange={(event) => {
                    setDraft({ ...draft, minStock: event.target.value });
                  }}
                />
              </div>
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
