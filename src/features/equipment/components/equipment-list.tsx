"use client";

import { MoreHorizontal, Plus, Wrench } from "lucide-react";
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
import { cn, centsToDollarsString, dollarsToCents, formatCents } from "@/lib/utils";

import { useEquipment, useEquipmentMutations } from "../hooks/use-equipment";
import { equipmentStatusSchema, type EquipmentItem, type EquipmentStatus } from "../schemas";

interface Draft {
  name: string;
  category: string;
  status: EquipmentStatus;
  serialNumber: string;
  location: string;
  purchaseCost: string;
  notes: string;
}

function toDraft(item: EquipmentItem | undefined): Draft {
  return {
    name: item?.name ?? "",
    category: item?.category ?? "",
    status: item?.status ?? "available",
    serialNumber: item?.serialNumber ?? "",
    location: item?.location ?? "",
    purchaseCost: item ? centsToDollarsString(item.purchaseCostCents) : "0.00",
    notes: item?.notes ?? "",
  };
}

const STATUS_STYLES: Record<EquipmentStatus, string> = {
  available: "bg-green-500/15 text-green-400",
  in_use: "bg-blue-500/15 text-blue-400",
  maintenance: "bg-amber-500/15 text-amber-400",
  retired: "bg-muted text-muted-foreground",
};

export function EquipmentList() {
  const dict = useTranslation();
  const t = dict.equipment;
  const fields = t.fields;
  const { data: items, isLoading } = useEquipment();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentItem | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(toDraft(undefined));
  const { create, update, remove, undoRemove } = useEquipmentMutations({
    onDone: () => {
      setFormOpen(false);
    },
  });

  function openForm(item: EquipmentItem | undefined) {
    setEditing(item);
    setDraft(toDraft(item));
    setFormOpen(true);
  }

  function handleSave() {
    const purchaseCostCents = dollarsToCents(draft.purchaseCost);
    if (!draft.name.trim() || purchaseCostCents === null) {
      toast.error(dict.errors.validation);
      return;
    }
    const values = {
      name: draft.name.trim(),
      category: draft.category,
      status: draft.status,
      serialNumber: draft.serialNumber,
      location: draft.location,
      purchaseCostCents,
      notes: draft.notes,
    };
    const mutation = editing
      ? update.mutateAsync({ current: editing, values })
      : create.mutateAsync(values);
    mutation.catch(() => toast.error(dict.errors.unknown));
  }

  function handleDelete(item: EquipmentItem) {
    remove.mutate(item, {
      onSuccess: () => {
        toast(t.deletedToast, {
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
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            openForm(undefined);
          }}
        >
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {t.new}
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
          <Wrench className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{t.empty}</p>
          <p className="text-sm text-muted-foreground">{t.emptyCta}</p>
          <Button
            onClick={() => {
              openForm(undefined);
            }}
          >
            {t.new}
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[item.category, item.serialNumber, item.location].filter(Boolean).join(" · ")}
                </p>
              </div>
              {item.purchaseCostCents > 0 && (
                <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
                  {formatCents(item.purchaseCostCents)}
                </span>
              )}
              <Badge variant="secondary" className={cn("border-0", STATUS_STYLES[item.status])}>
                {t.statuses[item.status]}
              </Badge>
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
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t.edit : t.new}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eq-name">{fields.name}</Label>
              <Input
                id="eq-name"
                value={draft.name}
                onChange={(event) => {
                  setDraft({ ...draft, name: event.target.value });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eq-category">{fields.category}</Label>
                <Input
                  id="eq-category"
                  placeholder={fields.categoryPlaceholder}
                  value={draft.category}
                  onChange={(event) => {
                    setDraft({ ...draft, category: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{fields.status}</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) => {
                    setDraft({ ...draft, status: value as EquipmentStatus });
                  }}
                >
                  <SelectTrigger aria-label={fields.status}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentStatusSchema.options.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t.statuses[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eq-serial">{fields.serialNumber}</Label>
                <Input
                  id="eq-serial"
                  value={draft.serialNumber}
                  onChange={(event) => {
                    setDraft({ ...draft, serialNumber: event.target.value });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eq-location">{fields.location}</Label>
                <Input
                  id="eq-location"
                  placeholder={fields.locationPlaceholder}
                  value={draft.location}
                  onChange={(event) => {
                    setDraft({ ...draft, location: event.target.value });
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:max-w-[12rem]">
              <Label htmlFor="eq-cost">{fields.purchaseCost}</Label>
              <Input
                id="eq-cost"
                inputMode="decimal"
                value={draft.purchaseCost}
                onChange={(event) => {
                  setDraft({ ...draft, purchaseCost: event.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-notes">{fields.notes}</Label>
              <Textarea
                id="eq-notes"
                rows={2}
                value={draft.notes}
                onChange={(event) => {
                  setDraft({ ...draft, notes: event.target.value });
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
