import type { Timestamp } from "firebase/firestore";

import { computeDocumentTotals } from "@/lib/totals";

/* Tipos estruturais (ADR-013) — dashboard não importa outras features. */
export interface DashJob {
  id: string;
  name: string;
  status: string;
  valueCents: number;
  paidCents: number;
  depositCents: number;
  costs: { qty: number; unitCostCents: number }[];
  date: Timestamp;
  createdAt: Timestamp;
}

export interface DashInvoice {
  jobId: string;
  status: string;
  paidAt: Timestamp | null;
  lineItems: { qty: number; unitPriceCents: number }[];
  discountPct: number;
  taxPct: number;
}

export interface LaborLogLike {
  jobId: string;
  crewMemberId: string | null;
  clockIn: Timestamp;
  clockOut: Timestamp | null;
  breakMinutes: number;
}

export interface PeriodWindow {
  /** inclusive, ms */
  start: number;
  /** exclusivo, ms */
  end: number;
}

/** MTD atual vs o MESMO trecho do mês anterior (comparável). */
export function monthToDateWindows(now: Date): { current: PeriodWindow; previous: PeriodWindow } {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const elapsed = now.getTime() - startOfMonth;
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  return {
    current: { start: startOfMonth, end: now.getTime() },
    previous: { start: startOfPreviousMonth, end: startOfPreviousMonth + elapsed },
  };
}

function inWindow(timestamp: Timestamp | null, window: PeriodWindow): boolean {
  if (!timestamp) return false;
  const ms = timestamp.toMillis();
  return ms >= window.start && ms < window.end;
}

export function activeJobsCount(jobs: Pick<DashJob, "status">[]): number {
  return jobs.filter((job) => job.status === "active").length;
}

/** Receita = invoices pagas (paidAt na janela), totais derivados. */
export function revenueCentsInWindow(invoices: DashInvoice[], window: PeriodWindow): number {
  return invoices
    .filter((invoice) => invoice.status === "paid" && inWindow(invoice.paidAt, window))
    .reduce(
      (sum, invoice) =>
        sum +
        computeDocumentTotals(invoice.lineItems, invoice.discountPct, invoice.taxPct).totalCents,
      0,
    );
}

/** Saldo em aberto = Σ balanceDue (§5) dos jobs faturados. */
export function unpaidBalanceCents(jobs: DashJob[]): number {
  return jobs
    .filter((job) => job.status === "invoiced")
    .reduce((sum, job) => sum + Math.max(0, job.valueCents - job.paidCents - job.depositCents), 0);
}

export function materialsCostCents(job: Pick<DashJob, "costs">): number {
  return Math.round(job.costs.reduce((sum, cost) => sum + cost.qty * cost.unitCostCents, 0));
}

/** labor por job a partir dos logs fechados (fórmula §5). */
export function laborByJobMap(
  logs: LaborLogLike[],
  crew: { id: string; hourlyRateCents: number }[],
  defaultRateCents: number,
): Map<string, number> {
  const rateById = new Map(crew.map((member) => [member.id, member.hourlyRateCents]));
  const result = new Map<string, number>();
  for (const log of logs) {
    if (!log.clockOut) continue;
    const hours = Math.max(
      0,
      (log.clockOut.toMillis() - log.clockIn.toMillis() - log.breakMinutes * 60_000) / 3_600_000,
    );
    const rate =
      log.crewMemberId === null
        ? defaultRateCents
        : (rateById.get(log.crewMemberId) ?? defaultRateCents);
    result.set(log.jobId, (result.get(log.jobId) ?? 0) + Math.round(hours * rate));
  }
  return result;
}

/** Margem MTD %: invoices pagas na janela vs custo real dos jobs vinculados. */
export function marginPctInWindow(
  jobs: DashJob[],
  invoices: DashInvoice[],
  laborByJob: Map<string, number>,
  window: PeriodWindow,
): number {
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  let revenue = 0;
  let cost = 0;
  for (const invoice of invoices) {
    if (invoice.status !== "paid" || !inWindow(invoice.paidAt, window)) continue;
    revenue += computeDocumentTotals(
      invoice.lineItems,
      invoice.discountPct,
      invoice.taxPct,
    ).totalCents;
    const job = jobById.get(invoice.jobId);
    if (job) cost += materialsCostCents(job) + (laborByJob.get(job.id) ?? 0);
  }
  if (revenue <= 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

export interface MonthPoint {
  /** rótulo curto, ex. "Jun" */
  label: string;
  revenueCents: number;
  costsCents: number;
}

/** Série de 12 meses: receita (invoices pagas) × custos (jobs por data agendada). */
export function monthlySeries(
  jobs: DashJob[],
  invoices: DashInvoice[],
  laborByJob: Map<string, number>,
  now: Date,
  locale: string,
): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const window: PeriodWindow = {
      start: monthStart.getTime(),
      end: new Date(now.getFullYear(), now.getMonth() - offset + 1, 1).getTime(),
    };
    const costsCents = jobs
      .filter((job) => inWindow(job.date, window))
      .reduce((sum, job) => sum + materialsCostCents(job) + (laborByJob.get(job.id) ?? 0), 0);
    points.push({
      label: monthStart.toLocaleDateString(locale, { month: "short" }),
      revenueCents: revenueCentsInWindow(invoices, window),
      costsCents,
    });
  }
  return points;
}

/** Variação % vs período anterior; null quando não comparável (base 0). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
