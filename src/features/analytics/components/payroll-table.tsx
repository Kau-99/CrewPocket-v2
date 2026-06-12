"use client";

import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

import type { PayrollRow } from "../utils";

/** Payroll por crew member — Pro (SPEC §8/§6.2). */
export function PayrollTable({ rows }: { rows: PayrollRow[] }) {
  const dict = useTranslation();

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-semibold">{dict.analytics.payrollTitle}</h2>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{dict.analytics.noData}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.name} className="flex justify-between py-2 text-sm">
              <span>{row.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.hours.toFixed(1)}h · {formatCents(row.costCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
