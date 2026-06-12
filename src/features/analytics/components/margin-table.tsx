"use client";

import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { cn, formatCents } from "@/lib/utils";

import type { MarginRow } from "../utils";

/** Margem por job, pior primeiro (SPEC §8); vermelho < minMargin. */
export function MarginTable({ rows, minMarginPct }: { rows: MarginRow[]; minMarginPct: number }) {
  const dict = useTranslation();

  return (
    <section className="rounded-lg border">
      <h2 className="p-4 pb-0 font-semibold">{dict.analytics.marginTitle}</h2>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{dict.analytics.noData}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.jobs.fields.name}</TableHead>
              <TableHead className="text-right">{dict.jobs.fields.value}</TableHead>
              <TableHead className="text-right">{dict.analytics.realCost}</TableHead>
              <TableHead className="text-right">{dict.jobs.summary.margin}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 15).map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/jobs/${row.id}`} className="hover:underline">
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(row.valueCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(row.realCostCents)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    row.marginPct < minMarginPct && "font-medium text-red-500",
                  )}
                >
                  {row.marginPct.toFixed(0)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
