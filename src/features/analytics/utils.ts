import type { Timestamp } from "firebase/firestore";

import { computeDocumentTotals } from "@/lib/totals";

/* Tipos estruturais (ADR-013). */
export interface AnalyticsJob {
  id: string;
  name: string;
  valueCents: number;
  paymentStatus: string;
  tags: string[];
  date: Timestamp;
  costs: { qty: number; unitCostCents: number }[];
}

export interface AnalyticsInvoice {
  jobId: string;
  status: string;
  paidAt: Timestamp | null;
  lineItems: { qty: number; unitPriceCents: number }[];
  discountPct: number;
  taxPct: number;
}

export interface AnalyticsLog {
  jobId: string;
  crewMemberId: string | null;
  crewName: string;
  clockIn: Timestamp;
  clockOut: Timestamp | null;
  breakMinutes: number;
}

export interface RangeWindow {
  start: number;
  end: number;
}

function materials(job: Pick<AnalyticsJob, "costs">): number {
  return Math.round(job.costs.reduce((sum, cost) => sum + cost.qty * cost.unitCostCents, 0));
}

function invoiceTotal(invoice: AnalyticsInvoice): number {
  return computeDocumentTotals(invoice.lineItems, invoice.discountPct, invoice.taxPct).totalCents;
}

function paidInWindow(invoice: AnalyticsInvoice, window: RangeWindow): boolean {
  if (invoice.status !== "paid" || !invoice.paidAt) return false;
  const ms = invoice.paidAt.toMillis();
  return ms >= window.start && ms < window.end;
}

export interface PnlResult {
  revenueCents: number;
  materialsCents: number;
  laborCents: number;
  profitCents: number;
}

/** P&L do período (SPEC §8): receita − materiais − labor = lucro. */
export function computePnl(
  jobs: AnalyticsJob[],
  invoices: AnalyticsInvoice[],
  laborByJob: Map<string, number>,
  window: RangeWindow,
): PnlResult {
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  let revenueCents = 0;
  let materialsCents = 0;
  let laborCents = 0;
  for (const invoice of invoices) {
    if (!paidInWindow(invoice, window)) continue;
    revenueCents += invoiceTotal(invoice);
    const job = jobById.get(invoice.jobId);
    if (job) {
      materialsCents += materials(job);
      laborCents += laborByJob.get(job.id) ?? 0;
    }
  }
  return {
    revenueCents,
    materialsCents,
    laborCents,
    profitCents: revenueCents - materialsCents - laborCents,
  };
}

export interface MarginRow {
  id: string;
  name: string;
  valueCents: number;
  realCostCents: number;
  marginPct: number;
}

/** Tabela de margem por job (SPEC §8) — só jobs com valor. */
export function marginRows(jobs: AnalyticsJob[], laborByJob: Map<string, number>): MarginRow[] {
  return jobs
    .filter((job) => job.valueCents > 0)
    .map((job) => {
      const realCostCents = materials(job) + (laborByJob.get(job.id) ?? 0);
      return {
        id: job.id,
        name: job.name,
        valueCents: job.valueCents,
        realCostCents,
        marginPct: ((job.valueCents - realCostCents) / job.valueCents) * 100,
      };
    })
    .sort((a, b) => a.marginPct - b.marginPct);
}

/** Receita por tag — jobs pagos; sem tag cai em untaggedKey. */
export function revenueByTag(jobs: AnalyticsJob[], untaggedKey: string): [string, number][] {
  const totals = new Map<string, number>();
  for (const job of jobs) {
    if (job.paymentStatus !== "paid") continue;
    const tags = job.tags.length > 0 ? job.tags : [untaggedKey];
    for (const tag of tags) {
      totals.set(tag, (totals.get(tag) ?? 0) + job.valueCents);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export interface PayrollRow {
  name: string;
  hours: number;
  costCents: number;
}

/** Payroll por crew member (Pro, SPEC §8/§6.2). */
export function payrollRows(
  logs: AnalyticsLog[],
  crew: { id: string; name: string; hourlyRateCents: number }[],
  defaultRateCents: number,
  ownerLabel: string,
  window: RangeWindow,
): PayrollRow[] {
  const byMember = new Map<string, { name: string; hours: number; costCents: number }>();
  const crewById = new Map(crew.map((member) => [member.id, member]));

  for (const log of logs) {
    if (!log.clockOut) continue;
    const ms = log.clockIn.toMillis();
    if (ms < window.start || ms >= window.end) continue;
    const hours = Math.max(
      0,
      (log.clockOut.toMillis() - log.clockIn.toMillis() - log.breakMinutes * 60_000) / 3_600_000,
    );
    const key = log.crewMemberId ?? "owner";
    const member = log.crewMemberId ? crewById.get(log.crewMemberId) : null;
    const name = member?.name ?? (log.crewMemberId ? log.crewName : ownerLabel);
    const rate = member?.hourlyRateCents ?? defaultRateCents;
    const entry = byMember.get(key) ?? { name, hours: 0, costCents: 0 };
    entry.hours += hours;
    entry.costCents += Math.round(hours * rate);
    byMember.set(key, entry);
  }
  return [...byMember.values()].sort((a, b) => b.costCents - a.costCents);
}

export interface TaxSummary {
  revenueCents: number;
  materialsCents: number;
  milesTotal: number;
  mileageDeductionCents: number;
  deductibleTotalCents: number;
}

/** Tax summary anual (SPEC §8): receita, despesas dedutíveis, milhas × rate. */
export function taxSummary(
  jobs: AnalyticsJob[],
  invoices: AnalyticsInvoice[],
  mileage: { date: Timestamp; miles: number }[],
  mileageRateCents: number,
  year: number,
): TaxSummary {
  const window: RangeWindow = {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year + 1, 0, 1).getTime(),
  };
  const revenueCents = invoices
    .filter((invoice) => paidInWindow(invoice, window))
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  const materialsCents = jobs
    .filter((job) => {
      const ms = job.date.toMillis();
      return ms >= window.start && ms < window.end;
    })
    .reduce((sum, job) => sum + materials(job), 0);
  const milesTotal = mileage
    .filter((log) => {
      const ms = log.date.toMillis();
      return ms >= window.start && ms < window.end;
    })
    .reduce((sum, log) => sum + log.miles, 0);
  const mileageDeductionCents = Math.round(milesTotal * mileageRateCents);
  return {
    revenueCents,
    materialsCents,
    milesTotal,
    mileageDeductionCents,
    deductibleTotalCents: materialsCents + mileageDeductionCents,
  };
}

/** CSV com escaping correto (vírgulas/aspas/quebras). */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell);
          return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(","),
    )
    .join("\n");
}
