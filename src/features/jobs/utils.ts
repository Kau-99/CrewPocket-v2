import type { Timestamp } from "firebase/firestore";

import type { Job, JobStatus } from "./schemas";

/* ───────────────────────── Fórmulas (SPEC §5) ─────────────────────────
 * Dinheiro é inteiro em centavos; qty pode ser fracionária, então o
 * arredondamento acontece UMA vez, no total — nunca por parcela. */

export function jobTotalCostCents(job: Pick<Job, "costs">): number {
  const total = job.costs.reduce((sum, cost) => sum + cost.qty * cost.unitCostCents, 0);
  return Math.round(total);
}

/* Tipagem estrutural: evita importar schemas de outras features
 * (time-tracking/crew) — features são ilhas (SPEC §3.2.1). */
interface LaborLog {
  crewMemberId: string | null;
  clockIn: Timestamp;
  clockOut: Timestamp | null;
  breakMinutes: number;
}

interface RatedMember {
  id: string;
  hourlyRateCents: number;
}

/** hours = (clockOut − clockIn − break) / 3.6e6; timer aberto não conta. */
export function timeLogHours(log: LaborLog): number {
  if (!log.clockOut) return 0;
  const ms = log.clockOut.toMillis() - log.clockIn.toMillis() - log.breakMinutes * 60_000;
  return Math.max(0, ms / 3_600_000);
}

export function jobLaborCostCents(
  timeLogs: LaborLog[],
  crew: RatedMember[],
  defaultRateCents: number,
): number {
  const rateById = new Map(crew.map((member) => [member.id, member.hourlyRateCents]));
  const total = timeLogs.reduce((sum, log) => {
    const rate =
      log.crewMemberId === null
        ? defaultRateCents
        : (rateById.get(log.crewMemberId) ?? defaultRateCents);
    return sum + timeLogHours(log) * rate;
  }, 0);
  return Math.round(total);
}

export function jobRealCostCents(
  job: Pick<Job, "costs">,
  timeLogs: LaborLog[],
  crew: RatedMember[],
  defaultRateCents: number,
): number {
  return jobTotalCostCents(job) + jobLaborCostCents(timeLogs, crew, defaultRateCents);
}

export function jobMarginCents(valueCents: number, realCostCents: number): number {
  return valueCents - realCostCents;
}

export function jobMarginPct(valueCents: number, realCostCents: number): number {
  if (valueCents <= 0) return 0;
  return (jobMarginCents(valueCents, realCostCents) / valueCents) * 100;
}

/** Saldo devedor nunca é negativo. */
export function balanceDueCents(
  job: Pick<Job, "valueCents" | "paidCents" | "depositCents">,
): number {
  return Math.max(0, job.valueCents - job.paidCents - job.depositCents);
}

/* ─────────────────── Máquina de estados (SPEC §4.2) ───────────────────
 * lead → quoted → draft → active → completed → invoiced
 * - qualquer estado pode voltar 1 passo (correção)
 * - lead/quoted podem ir direto para draft
 * - invoiced é terminal exceto → completed (estorno) — coberto pelo "volta 1" */

export const JOB_STATUS_ORDER: readonly JobStatus[] = [
  "lead",
  "quoted",
  "draft",
  "active",
  "completed",
  "invoiced",
];

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return false;
  const fromIndex = JOB_STATUS_ORDER.indexOf(from);
  const toIndex = JOB_STATUS_ORDER.indexOf(to);
  if (toIndex === fromIndex + 1 || toIndex === fromIndex - 1) return true;
  return from === "lead" && to === "draft";
}

export function allowedTransitions(from: JobStatus): JobStatus[] {
  return JOB_STATUS_ORDER.filter((to) => canTransition(from, to));
}
