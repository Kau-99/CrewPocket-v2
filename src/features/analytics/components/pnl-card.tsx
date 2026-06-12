"use client";

import { useTranslation } from "@/hooks/use-translation";
import { cn, formatCents } from "@/lib/utils";

import type { PnlResult } from "../utils";

/** P&L do período: receita − materiais − labor = lucro (SPEC §8). */
export function PnlCard({ pnl }: { pnl: PnlResult }) {
  const dict = useTranslation();
  const rows: [string, number, boolean][] = [
    [dict.analytics.revenue, pnl.revenueCents, false],
    [dict.analytics.materials, -pnl.materialsCents, false],
    [dict.analytics.labor, -pnl.laborCents, false],
    [dict.analytics.profit, pnl.profitCents, true],
  ];

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-semibold">{dict.analytics.pnlTitle}</h2>
      <dl className="space-y-2">
        {rows.map(([label, cents, isTotal]) => (
          <div
            key={label}
            className={cn("flex justify-between text-sm", isTotal && "border-t pt-2 font-semibold")}
          >
            <dt className={isTotal ? "" : "text-muted-foreground"}>{label}</dt>
            <dd
              className={cn(
                "tabular-nums",
                isTotal && (cents >= 0 ? "text-emerald-400" : "text-red-400"),
              )}
            >
              {formatCents(cents)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
