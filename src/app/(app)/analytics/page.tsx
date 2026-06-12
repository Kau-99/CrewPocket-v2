"use client";

import { useMemo, useState } from "react";

import { UpgradeGate } from "@/components/shared/upgrade-gate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarginTable } from "@/features/analytics/components/margin-table";
import { PayrollTable } from "@/features/analytics/components/payroll-table";
import { PnlCard } from "@/features/analytics/components/pnl-card";
import { TagRevenue } from "@/features/analytics/components/tag-revenue";
import { TaxSummaryCard } from "@/features/analytics/components/tax-summary-card";
import {
  computePnl,
  marginRows,
  payrollRows,
  revenueByTag,
  taxSummary,
  toCsv,
  type RangeWindow,
} from "@/features/analytics/utils";
import { useCrewMembers } from "@/features/crew/hooks/use-crew";
import { laborByJobMap } from "@/features/dashboard/utils";
import { useAllInvoices } from "@/features/invoices/hooks/use-invoices";
import { useAllJobs } from "@/features/jobs/hooks/use-jobs";
import { useAllMileage } from "@/features/mileage/hooks/use-mileage";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useAllLogs } from "@/features/time-tracking/hooks/use-time-logs";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

type Period = "thisMonth" | "lastMonth" | "thisYear";

function windowFor(period: Period, now: Date): RangeWindow {
  switch (period) {
    case "thisMonth":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        end: now.getTime(),
      };
    case "lastMonth":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
        end: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      };
    case "thisYear":
      return {
        start: new Date(now.getFullYear(), 0, 1).getTime(),
        end: now.getTime(),
      };
  }
}

// Composição cross-feature do Analytics (SPEC §8)
export default function AnalyticsPage() {
  const dict = useTranslation();
  const [period, setPeriod] = useState<Period>("thisMonth");
  const entitlements = useEntitlements();
  const { settings } = useSettings();
  const { data: jobs } = useAllJobs();
  const { data: invoices } = useAllInvoices();
  const { data: logs } = useAllLogs();
  const { data: crew } = useCrewMembers();
  const { data: mileage } = useAllMileage();

  const year = new Date().getFullYear();
  const computed = useMemo(() => {
    const now = new Date();
    const window = windowFor(period, now);
    const crewRates = (crew ?? []).map((member) => ({
      id: member.id,
      name: member.name,
      hourlyRateCents: member.hourlyRateCents,
    }));
    const laborByJob = laborByJobMap(
      logs ?? [],
      crewRates,
      settings?.defaultLaborRateCents ?? 65_00,
    );
    return {
      pnl: computePnl(jobs ?? [], invoices ?? [], laborByJob, window),
      margins: marginRows(jobs ?? [], laborByJob),
      tags: revenueByTag(jobs ?? [], dict.analytics.untagged),
      payroll: payrollRows(
        logs ?? [],
        crewRates,
        settings?.defaultLaborRateCents ?? 65_00,
        dict.time.owner,
        window,
      ),
      tax: taxSummary(
        jobs ?? [],
        invoices ?? [],
        mileage ?? [],
        settings?.mileageRateCents ?? 67,
        year,
      ),
    };
  }, [period, jobs, invoices, logs, crew, mileage, settings, dict, year]);

  function exportTaxCsv() {
    const csv = toCsv([
      [dict.analytics.taxTitle, String(year)],
      [dict.analytics.revenue, formatCents(computed.tax.revenueCents)],
      [dict.analytics.materials, formatCents(computed.tax.materialsCents)],
      [dict.analytics.miles, computed.tax.milesTotal.toFixed(1)],
      [dict.analytics.mileageDeduction, formatCents(computed.tax.mileageDeductionCents)],
      [dict.analytics.deductible, formatCents(computed.tax.deductibleTotalCents)],
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tax-summary-${year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.nav.analytics}</h1>
        <Select
          value={period}
          onValueChange={(value) => {
            setPeriod(value as Period);
          }}
        >
          <SelectTrigger className="ml-auto w-40" aria-label={dict.analytics.period}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["thisMonth", "lastMonth", "thisYear"] as const).map((option) => (
              <SelectItem key={option} value={option}>
                {dict.analytics.periods[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PnlCard pnl={computed.pnl} />
        <TagRevenue entries={computed.tags} />
      </div>

      <MarginTable rows={computed.margins} minMarginPct={settings?.minMarginPct ?? 20} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpgradeGate allowed={entitlements.advancedAnalytics}>
          <PayrollTable rows={computed.payroll} />
        </UpgradeGate>
        <UpgradeGate allowed={entitlements.exportCsv}>
          <TaxSummaryCard
            year={year}
            summary={computed.tax}
            canExport={entitlements.exportCsv}
            onExport={exportTaxCsv}
          />
        </UpgradeGate>
      </div>
    </div>
  );
}
