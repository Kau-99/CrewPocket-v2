"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import type { JobStatus } from "../schemas";

const STATUS_CLASSES: Record<JobStatus, string> = {
  lead: "bg-slate-500/15 text-slate-400",
  quoted: "bg-sky-500/15 text-sky-400",
  draft: "bg-zinc-500/15 text-zinc-400",
  active: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-teal-500/15 text-teal-400",
  invoiced: "bg-violet-500/15 text-violet-400",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const dict = useTranslation();
  return (
    <Badge variant="secondary" className={cn("border-0", STATUS_CLASSES[status])}>
      {dict.jobs.statuses[status]}
    </Badge>
  );
}
