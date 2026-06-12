"use client";

import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

/** Receita por tag/categoria (SPEC §8). */
export function TagRevenue({ entries }: { entries: [string, number][] }) {
  const dict = useTranslation();
  const max = entries[0]?.[1] ?? 0;

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-semibold">{dict.analytics.tagTitle}</h2>
      {entries.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{dict.analytics.noData}</p>
      ) : (
        <ul className="space-y-2">
          {entries.slice(0, 8).map(([tag, cents]) => (
            <li key={tag} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{tag}</span>
                <span className="tabular-nums text-muted-foreground">{formatCents(cents)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${max > 0 ? (cents / max) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
