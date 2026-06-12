"use client";

import { useMemo } from "react";

import { useCrewMembers } from "@/features/crew/hooks/use-crew";
import { KpiCards, type KpiItem } from "@/features/dashboard/components/kpi-cards";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentJobs } from "@/features/dashboard/components/recent-jobs";
import { RevenueChart } from "@/features/dashboard/components/revenue-chart";
import {
  activeJobsCount,
  laborByJobMap,
  marginPctInWindow,
  monthlySeries,
  monthToDateWindows,
  pctChange,
  revenueCentsInWindow,
  unpaidBalanceCents,
} from "@/features/dashboard/utils";
import { useAllInvoices } from "@/features/invoices/hooks/use-invoices";
import { useAllJobs } from "@/features/jobs/hooks/use-jobs";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useAllLogs } from "@/features/time-tracking/hooks/use-time-logs";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation } from "@/hooks/use-translation";
import { useUiStore } from "@/hooks/use-ui-store";
import { formatCents } from "@/lib/utils";

// Composição cross-feature do dashboard (SPEC §3.2.1/§8)
export default function DashboardPage() {
  const dict = useTranslation();
  const language = useUiStore((state) => state.language);
  const { settings } = useSettings();
  const { data: jobs } = useAllJobs();
  const { data: invoices } = useAllInvoices();
  const { data: logs } = useAllLogs();
  const { data: crew } = useCrewMembers();
  const notifications = useNotifications();

  const computed = useMemo(() => {
    const now = new Date();
    const { current, previous } = monthToDateWindows(now);
    const laborByJob = laborByJobMap(
      logs ?? [],
      (crew ?? []).map((member) => ({ id: member.id, hourlyRateCents: member.hourlyRateCents })),
      settings?.defaultLaborRateCents ?? 65_00,
    );
    const revenueNow = revenueCentsInWindow(invoices ?? [], current);
    const revenuePrev = revenueCentsInWindow(invoices ?? [], previous);
    const marginNow = marginPctInWindow(jobs ?? [], invoices ?? [], laborByJob, current);
    const marginPrev = marginPctInWindow(jobs ?? [], invoices ?? [], laborByJob, previous);

    return {
      activeJobs: activeJobsCount(jobs ?? []),
      revenueNow,
      revenueChange: pctChange(revenueNow, revenuePrev),
      marginNow,
      marginChange: pctChange(marginNow, marginPrev),
      unpaid: unpaidBalanceCents(jobs ?? []),
      series: monthlySeries(jobs ?? [], invoices ?? [], laborByJob, now, language),
    };
  }, [jobs, invoices, logs, crew, settings?.defaultLaborRateCents, language]);

  const kpis: KpiItem[] = [
    { label: dict.dashboard.activeJobs, value: String(computed.activeJobs), change: null },
    {
      label: dict.dashboard.revenueMtd,
      value: formatCents(computed.revenueNow),
      change: computed.revenueChange,
    },
    {
      label: dict.dashboard.marginMtd,
      value: `${computed.marginNow.toFixed(0)}%`,
      change: computed.marginChange,
      alert: computed.marginNow > 0 && computed.marginNow < (settings?.minMarginPct ?? 20),
    },
    { label: dict.dashboard.unpaidBalance, value: formatCents(computed.unpaid), change: null },
  ];

  const recentJobs = (jobs ?? []).slice(0, 5).map((job) => ({
    id: job.id,
    name: job.name,
    clientName: job.clientName,
    valueCents: job.valueCents,
    statusLabel: dict.jobs.statuses[job.status],
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.nav.dashboard}</h1>
        <div className="ml-auto">
          <QuickActions />
        </div>
      </div>

      <KpiCards items={kpis} />
      <RevenueChart data={computed.series} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentJobs jobs={recentJobs} />
        <section className="space-y-2">
          <h2 className="font-semibold">{dict.notifications.title}</h2>
          {notifications.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {dict.notifications.empty}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {notifications.slice(0, 6).map((notification) => (
                <li key={notification.id} className="p-3 text-sm">
                  <a href={notification.href} className="hover:underline">
                    {notification.message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
