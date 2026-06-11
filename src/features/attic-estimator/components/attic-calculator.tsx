"use client";

import { FilePlus2 } from "lucide-react";
import { useState } from "react";

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
import { useTranslation } from "@/hooks/use-translation";
import { centsToDollarsString, dollarsToCents, formatCents } from "@/lib/utils";

import {
  computeAtticEstimate,
  DEFAULT_BAG_COST_CENTS,
  R_VALUES,
  type AtticEstimate,
  type RValue,
} from "../utils";

export interface AtticResult extends AtticEstimate {
  sqft: number;
  rValue: RValue;
  bagCostCents: number;
  laborRateCents: number;
}

interface AtticCalculatorProps {
  /** settings.defaultLaborRateCents */
  defaultLaborRateCents: number;
  /** "Create Estimate from this" — criação fica com a página (ilhas). */
  onCreateEstimate: (result: AtticResult) => void;
  creating: boolean;
}

export function AtticCalculator({
  defaultLaborRateCents,
  onCreateEstimate,
  creating,
}: AtticCalculatorProps) {
  const dict = useTranslation();
  const [sqft, setSqft] = useState("1000");
  const [rValue, setRValue] = useState<RValue>("R-38");
  const [bagCost, setBagCost] = useState(centsToDollarsString(DEFAULT_BAG_COST_CENTS));
  const [laborRate, setLaborRate] = useState(centsToDollarsString(defaultLaborRateCents));

  const sqftNumber = Number(sqft);
  const bagCostCents = dollarsToCents(bagCost);
  const laborRateCents = dollarsToCents(laborRate);
  const valid =
    Number.isFinite(sqftNumber) &&
    sqftNumber > 0 &&
    bagCostCents !== null &&
    laborRateCents !== null;

  const estimate = valid
    ? computeAtticEstimate(sqftNumber, rValue, bagCostCents, laborRateCents)
    : null;

  const rows: [string, string][] = estimate
    ? [
        [dict.attic.bags, String(estimate.bags)],
        [dict.attic.laborHours, estimate.laborHours.toFixed(1)],
        [dict.attic.material, formatCents(estimate.materialCents)],
        [dict.attic.labor, formatCents(estimate.laborCents)],
        [dict.attic.total, formatCents(estimate.totalCents)],
      ]
    : [];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">{dict.attic.title}</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="attic-sqft">{dict.attic.sqft}</Label>
          <Input
            id="attic-sqft"
            inputMode="numeric"
            value={sqft}
            onChange={(event) => {
              setSqft(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{dict.attic.rValue}</Label>
          <Select
            value={rValue}
            onValueChange={(value) => {
              setRValue(value as RValue);
            }}
          >
            <SelectTrigger aria-label={dict.attic.rValue}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {R_VALUES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="attic-bag">{dict.attic.bagCost}</Label>
          <Input
            id="attic-bag"
            inputMode="decimal"
            value={bagCost}
            onChange={(event) => {
              setBagCost(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="attic-rate">{dict.attic.laborRate}</Label>
          <Input
            id="attic-rate"
            inputMode="decimal"
            value={laborRate}
            onChange={(event) => {
              setLaborRate(event.target.value);
            }}
          />
        </div>
      </div>

      {estimate && (
        <section className="rounded-lg border p-4">
          <dl className="space-y-2">
            {rows.map(([label, value], index) => (
              <div
                key={label}
                className={
                  index === rows.length - 1
                    ? "flex justify-between border-t pt-2 font-semibold"
                    : "flex justify-between text-sm"
                }
              >
                <dt className={index === rows.length - 1 ? "" : "text-muted-foreground"}>
                  {label}
                </dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <Button
        className="w-full"
        disabled={!estimate || creating}
        onClick={() => {
          if (estimate && bagCostCents !== null && laborRateCents !== null) {
            onCreateEstimate({
              ...estimate,
              sqft: sqftNumber,
              rValue,
              bagCostCents,
              laborRateCents,
            });
          }
        }}
      >
        <FilePlus2 className="mr-1 size-4" aria-hidden="true" />
        {creating ? dict.common.loading : dict.attic.createEstimate}
      </Button>
    </div>
  );
}
