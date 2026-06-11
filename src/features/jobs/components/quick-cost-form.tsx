"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { dollarsToCents } from "@/lib/utils";

import { useJobMutations } from "../hooks/use-jobs";
import type { Job } from "../schemas";

/** Custo rápido do /field: nome + qty + custo em 1 tela (SPEC §8). */
export function QuickCostForm({ job }: { job: Job }) {
  const dict = useTranslation();
  const labels = dict.jobs.costs;
  const { setCosts } = useJobMutations();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("");

  function submit() {
    const qtyNumber = Number(qty);
    const unitCostCents = dollarsToCents(unitCost);
    if (!name.trim() || !Number.isFinite(qtyNumber) || qtyNumber < 0 || unitCostCents === null) {
      toast.error(dict.errors.validation);
      return;
    }
    setCosts.mutate(
      {
        job,
        costs: [
          ...job.costs,
          {
            id: crypto.randomUUID(),
            name: name.trim(),
            category: "material",
            qty: qtyNumber,
            unitCostCents,
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success(dict.field.quickCostAdded);
          setName("");
          setQty("1");
          setUnitCost("");
        },
        onError: () => toast.error(dict.errors.unknown),
      },
    );
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">{dict.field.quickCost}</h2>
      <div className="grid grid-cols-[1fr_4.5rem_6rem] gap-2">
        <Input
          value={name}
          placeholder={labels.name}
          aria-label={labels.name}
          className="min-h-12"
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <Input
          value={qty}
          inputMode="decimal"
          aria-label={labels.qty}
          className="min-h-12"
          onChange={(event) => {
            setQty(event.target.value);
          }}
        />
        <Input
          value={unitCost}
          inputMode="decimal"
          placeholder="0.00"
          aria-label={labels.unitCost}
          className="min-h-12"
          onChange={(event) => {
            setUnitCost(event.target.value);
          }}
        />
      </div>
      <Button className="min-h-12 w-full" disabled={setCosts.isPending} onClick={submit}>
        <Plus className="mr-1 size-5" aria-hidden="true" />
        {labels.add}
      </Button>
    </section>
  );
}
