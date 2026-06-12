"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

export interface RecentJob {
  id: string;
  name: string;
  /** rótulo de status já traduzido pela página */
  statusLabel: string;
  clientName: string;
  valueCents: number;
}

/** 5 jobs recentes (SPEC §8). */
export function RecentJobs({ jobs }: { jobs: RecentJob[] }) {
  const dict = useTranslation();

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{dict.dashboard.recentJobs}</h2>
      {jobs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {dict.jobs.empty}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/jobs/${job.id}`} className="text-sm font-medium hover:underline">
                  {job.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{job.clientName || "—"}</p>
              </div>
              <span className="text-sm tabular-nums">{formatCents(job.valueCents)}</span>
              <Badge variant="secondary">{job.statusLabel}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
