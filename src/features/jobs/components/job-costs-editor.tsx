"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import { centsToDollarsString, dollarsToCents, formatCents } from "@/lib/utils";

import { useJobMutations } from "../hooks/use-jobs";
import { costCategorySchema, type CostCategory, type CostItem, type Job } from "../schemas";
import { jobTotalCostCents } from "../utils";

interface DraftCost {
  name: string;
  category: CostCategory;
  qty: string;
  unitCost: string;
}

const EMPTY_DRAFT: DraftCost = { name: "", category: "material", qty: "1", unitCost: "0.00" };

function parseDraft(draft: DraftCost): Omit<CostItem, "id"> | null {
  const qty = Number(draft.qty);
  const unitCostCents = dollarsToCents(draft.unitCost);
  if (!draft.name.trim() || !Number.isFinite(qty) || qty < 0 || unitCostCents === null) return null;
  return { name: draft.name.trim(), category: draft.category, qty, unitCostCents };
}

/** Editor de custos inline do Job detail (SPEC §8). */
export function JobCostsEditor({ job }: { job: Job }) {
  const dict = useTranslation();
  const labels = dict.jobs.costs;
  const { setCosts } = useJobMutations();
  const [draft, setDraft] = useState<DraftCost>(EMPTY_DRAFT);

  function persist(costs: CostItem[]) {
    setCosts.mutate({ job, costs }, { onError: () => toast.error(dict.errors.unknown) });
  }

  function addDraft() {
    const parsed = parseDraft(draft);
    if (!parsed) {
      toast.error(dict.errors.validation);
      return;
    }
    persist([...job.costs, { ...parsed, id: crypto.randomUUID() }]);
    setDraft(EMPTY_DRAFT);
  }

  function updateItem(id: string, patch: Partial<Omit<CostItem, "id">>) {
    persist(job.costs.map((cost) => (cost.id === id ? { ...cost, ...patch } : cost)));
  }

  function removeItem(id: string) {
    persist(job.costs.filter((cost) => cost.id !== id));
  }

  const categoryNames = labels.categories;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{labels.title}</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {labels.total}: {formatCents(jobTotalCostCents(job))}
        </span>
      </div>

      {job.costs.length === 0 && <p className="text-sm text-muted-foreground">{labels.empty}</p>}

      <ul className="space-y-2">
        {job.costs.map((cost) => (
          <li
            key={cost.id}
            className="grid grid-cols-[1fr_5rem_6rem_auto] items-center gap-2 sm:grid-cols-[1fr_8rem_5rem_6rem_6rem_auto]"
          >
            <Input
              defaultValue={cost.name}
              aria-label={labels.name}
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (name && name !== cost.name) updateItem(cost.id, { name });
              }}
            />
            <Select
              value={cost.category}
              onValueChange={(category) => {
                updateItem(cost.id, { category: category as CostCategory });
              }}
            >
              <SelectTrigger className="hidden sm:flex" aria-label={labels.category}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {costCategorySchema.options.map((category) => (
                  <SelectItem key={category} value={category}>
                    {categoryNames[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              defaultValue={String(cost.qty)}
              inputMode="decimal"
              aria-label={labels.qty}
              onBlur={(event) => {
                const qty = Number(event.target.value);
                if (Number.isFinite(qty) && qty >= 0 && qty !== cost.qty)
                  updateItem(cost.id, { qty });
              }}
            />
            <Input
              defaultValue={centsToDollarsString(cost.unitCostCents)}
              inputMode="decimal"
              aria-label={labels.unitCost}
              onBlur={(event) => {
                const cents = dollarsToCents(event.target.value);
                if (cents !== null && cents !== cost.unitCostCents) {
                  updateItem(cost.id, { unitCostCents: cents });
                }
              }}
            />
            <span className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">
              {formatCents(Math.round(cost.qty * cost.unitCostCents))}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dict.common.delete}
              onClick={() => {
                removeItem(cost.id);
              }}
            >
              <Trash2 className="size-4 text-destructive" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2 border-t pt-3 sm:grid-cols-[1fr_8rem_5rem_6rem_auto]">
        <Input
          value={draft.name}
          placeholder={labels.name}
          aria-label={labels.name}
          onChange={(event) => {
            setDraft({ ...draft, name: event.target.value });
          }}
        />
        <Select
          value={draft.category}
          onValueChange={(category) => {
            setDraft({ ...draft, category: category as CostCategory });
          }}
        >
          <SelectTrigger className="hidden sm:flex" aria-label={labels.category}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {costCategorySchema.options.map((category) => (
              <SelectItem key={category} value={category}>
                {categoryNames[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={draft.qty}
          inputMode="decimal"
          aria-label={labels.qty}
          onChange={(event) => {
            setDraft({ ...draft, qty: event.target.value });
          }}
        />
        <Input
          value={draft.unitCost}
          inputMode="decimal"
          aria-label={labels.unitCost}
          onChange={(event) => {
            setDraft({ ...draft, unitCost: event.target.value });
          }}
        />
        <Button onClick={addDraft} disabled={setCosts.isPending}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {labels.add}
        </Button>
      </div>
    </section>
  );
}
