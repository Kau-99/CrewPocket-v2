"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

import type { TaxSummary } from "../utils";

interface TaxSummaryCardProps {
  year: number;
  summary: TaxSummary;
  /** export CSV é Pro (SPEC §6.2) — o botão só aparece liberado */
  canExport: boolean;
  onExport: () => void;
}

/** Tax summary anual (SPEC §8). */
export function TaxSummaryCard({ year, summary, canExport, onExport }: TaxSummaryCardProps) {
  const dict = useTranslation();
  const rows: [string, string][] = [
    [dict.analytics.revenue, formatCents(summary.revenueCents)],
    [dict.analytics.materials, formatCents(summary.materialsCents)],
    [
      dict.analytics.miles,
      `${summary.milesTotal.toFixed(1)} mi · ${formatCents(summary.mileageDeductionCents)}`,
    ],
    [dict.analytics.deductible, formatCents(summary.deductibleTotalCents)],
  ];

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          {dict.analytics.taxTitle} {year}
        </h2>
        {canExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-1 size-4" aria-hidden="true" />
            {dict.analytics.exportCsv}
          </Button>
        )}
      </div>
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
