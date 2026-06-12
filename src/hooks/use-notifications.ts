"use client";

import { useMemo } from "react";

import { laborByJobMap, materialsCostCents } from "@/features/dashboard/utils";
import { useAllEstimates } from "@/features/estimates/hooks/use-estimates";
import { useCrewMembers } from "@/features/crew/hooks/use-crew";
import { useInventory } from "@/features/inventory/hooks/use-inventory";
import { useAllInvoices } from "@/features/invoices/hooks/use-invoices";
import { useAllJobs } from "@/features/jobs/hooks/use-jobs";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useAllLogs } from "@/features/time-tracking/hooks/use-time-logs";
import { useTranslation } from "@/hooks/use-translation";
import { fillTemplate } from "@/lib/pdf-actions";

export interface AppNotification {
  id: string;
  message: string;
  href: string;
}

/**
 * Central de notificações in-app (SPEC §5) — derivada dos dados, sem
 * coleção própria: margem baixa, low stock, estimate expirado, invoice
 * vencida, deadline ≤ 48h. (expired/overdue já são auto-marcados na leitura.)
 */
export function useNotifications(): AppNotification[] {
  const dict = useTranslation();
  const { settings } = useSettings();
  const { data: jobs } = useAllJobs();
  const { data: invoices } = useAllInvoices();
  const { data: estimates } = useAllEstimates();
  const { data: inventory } = useInventory();
  const { data: crew } = useCrewMembers();
  const { data: logs } = useAllLogs();

  const minMarginPct = settings?.minMarginPct ?? 20;
  const defaultRateCents = settings?.defaultLaborRateCents ?? 65_00;

  return useMemo(() => {
    const items: AppNotification[] = [];
    const messages = dict.notifications;

    const laborByJob = laborByJobMap(
      logs ?? [],
      (crew ?? []).map((member) => ({ id: member.id, hourlyRateCents: member.hourlyRateCents })),
      defaultRateCents,
    );

    for (const job of jobs ?? []) {
      if (job.status === "active" && job.valueCents > 0) {
        const realCost = materialsCostCents(job) + (laborByJob.get(job.id) ?? 0);
        const marginPct = ((job.valueCents - realCost) / job.valueCents) * 100;
        if (marginPct < minMarginPct) {
          items.push({
            id: `margin-${job.id}`,
            message: fillTemplate(messages.lowMargin, {
              job: job.name,
              margin: marginPct.toFixed(0),
            }),
            href: `/jobs/${job.id}`,
          });
        }
      }
      if (
        job.deadline &&
        job.status !== "completed" &&
        job.status !== "invoiced" &&
        job.deadline.toMillis() - Date.now() <= 48 * 3_600_000 &&
        job.deadline.toMillis() > Date.now() - 24 * 3_600_000
      ) {
        items.push({
          id: `deadline-${job.id}`,
          message: fillTemplate(messages.deadlineSoon, { job: job.name }),
          href: `/jobs/${job.id}`,
        });
      }
    }

    for (const item of inventory ?? []) {
      if (item.quantity <= item.minStock) {
        items.push({
          id: `stock-${item.id}`,
          message: fillTemplate(messages.lowStock, { item: item.name }),
          href: "/inventory",
        });
      }
    }

    for (const estimate of estimates ?? []) {
      if (estimate.status === "expired") {
        items.push({
          id: `estimate-${estimate.id}`,
          message: fillTemplate(messages.estimateExpired, { number: estimate.number }),
          href: `/estimates/${estimate.id}`,
        });
      }
    }

    for (const invoice of invoices ?? []) {
      if (invoice.status === "overdue") {
        items.push({
          id: `invoice-${invoice.id}`,
          message: fillTemplate(messages.invoiceOverdue, { number: invoice.number }),
          href: `/invoices/${invoice.id}`,
        });
      }
    }

    return items;
  }, [dict, jobs, invoices, estimates, inventory, crew, logs, minMarginPct, defaultRateCents]);
}
