"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import type { InvoiceStatus } from "../schemas";

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: "bg-zinc-500/15 text-zinc-400",
  sent: "bg-sky-500/15 text-sky-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  overdue: "bg-red-500/15 text-red-400",
  void: "bg-slate-500/15 text-slate-400",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const dict = useTranslation();
  return (
    <Badge variant="secondary" className={cn("border-0", STATUS_CLASSES[status])}>
      {dict.invoices.statuses[status]}
    </Badge>
  );
}
