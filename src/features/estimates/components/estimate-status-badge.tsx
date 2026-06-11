"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import type { EstimateStatus } from "../schemas";

const STATUS_CLASSES: Record<EstimateStatus, string> = {
  draft: "bg-zinc-500/15 text-zinc-400",
  sent: "bg-sky-500/15 text-sky-400",
  accepted: "bg-emerald-500/15 text-emerald-400",
  declined: "bg-red-500/15 text-red-400",
  expired: "bg-amber-500/15 text-amber-400",
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const dict = useTranslation();
  return (
    <Badge variant="secondary" className={cn("border-0", STATUS_CLASSES[status])}>
      {dict.estimates.statuses[status]}
    </Badge>
  );
}
