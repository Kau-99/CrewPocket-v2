import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  activeJobsCount,
  laborByJobMap,
  marginPctInWindow,
  monthlySeries,
  monthToDateWindows,
  pctChange,
  revenueCentsInWindow,
  unpaidBalanceCents,
  type DashInvoice,
  type DashJob,
} from "../utils";

const NOW = new Date("2026-06-15T12:00:00");

function ts(iso: string) {
  return Timestamp.fromDate(new Date(iso));
}

function job(overrides: Partial<DashJob> = {}): DashJob {
  return {
    id: "job-1",
    name: "Job",
    status: "invoiced",
    valueCents: 100_000,
    paidCents: 0,
    depositCents: 0,
    costs: [{ qty: 10, unitCostCents: 10_00 }],
    date: ts("2026-06-10T12:00:00"),
    createdAt: ts("2026-06-01T12:00:00"),
    ...overrides,
  };
}

function invoice(overrides: Partial<DashInvoice> = {}): DashInvoice {
  return {
    jobId: "job-1",
    status: "paid",
    paidAt: ts("2026-06-10T12:00:00"),
    lineItems: [{ qty: 1, unitPriceCents: 100_000 }],
    discountPct: 0,
    taxPct: 0,
    ...overrides,
  };
}

describe("monthToDateWindows", () => {
  it("compara o MTD com o mesmo trecho do mês anterior", () => {
    const { current, previous } = monthToDateWindows(NOW);
    expect(new Date(current.start).getDate()).toBe(1);
    expect(current.end).toBe(NOW.getTime());
    // mesma duração nas duas janelas
    expect(previous.end - previous.start).toBe(current.end - current.start);
    expect(new Date(previous.start).getMonth()).toBe(4); // maio
  });
});

describe("KPIs", () => {
  it("activeJobsCount conta só status active", () => {
    expect(
      activeJobsCount([
        job({ status: "active" }),
        job({ status: "lead" }),
        job({ status: "active" }),
      ]),
    ).toBe(2);
  });

  it("revenue soma invoices pagas na janela (totais derivados)", () => {
    const { current } = monthToDateWindows(NOW);
    const invoices = [
      invoice(),
      invoice({ paidAt: ts("2026-05-10T12:00:00") }), // fora da janela
      invoice({ status: "sent", paidAt: null }), // não paga
      invoice({ lineItems: [{ qty: 2, unitPriceCents: 50_000 }], taxPct: 10 }),
    ];
    expect(revenueCentsInWindow(invoices, current)).toBe(100_000 + 110_000);
  });

  it("unpaid balance = Σ balanceDue dos jobs faturados, nunca negativo", () => {
    const jobs = [
      job({ paidCents: 30_000, depositCents: 20_000 }), // 50_000
      job({ id: "j2", paidCents: 120_000 }), // clamp 0
      job({ id: "j3", status: "active", paidCents: 0 }), // não faturado → fora
    ];
    expect(unpaidBalanceCents(jobs)).toBe(50_000);
  });

  it("margem MTD usa materiais + labor dos jobs das invoices pagas", () => {
    const { current } = monthToDateWindows(NOW);
    const labor = new Map([["job-1", 20_000]]);
    // receita 100_000; custo 10_000 (materiais) + 20_000 (labor) = 30_000 → 70%
    expect(marginPctInWindow([job()], [invoice()], labor, current)).toBeCloseTo(70);
  });

  it("margem com receita 0 → 0 (não divide por zero)", () => {
    expect(marginPctInWindow([], [], new Map(), monthToDateWindows(NOW).current)).toBe(0);
  });
});

describe("laborByJobMap", () => {
  it("agrupa custo de labor por job com a taxa do membro (default p/ dono)", () => {
    const logs = [
      {
        jobId: "job-1",
        crewMemberId: "m1",
        clockIn: ts("2026-06-10T08:00:00"),
        clockOut: ts("2026-06-10T12:00:00"),
        breakMinutes: 0,
      },
      {
        jobId: "job-1",
        crewMemberId: null,
        clockIn: ts("2026-06-10T08:00:00"),
        clockOut: ts("2026-06-10T10:00:00"),
        breakMinutes: 0,
      },
      {
        jobId: "job-2",
        crewMemberId: null,
        clockIn: ts("2026-06-10T08:00:00"),
        clockOut: null, // timer aberto não conta
        breakMinutes: 0,
      },
    ];
    const map = laborByJobMap(logs, [{ id: "m1", hourlyRateCents: 25_00 }], 65_00);
    expect(map.get("job-1")).toBe(4 * 25_00 + 2 * 65_00);
    expect(map.get("job-2")).toBeUndefined();
  });
});

describe("monthlySeries", () => {
  it("retorna 12 pontos com receita e custos por mês", () => {
    const series = monthlySeries([job()], [invoice()], new Map([["job-1", 5_000]]), NOW, "en-US");
    expect(series).toHaveLength(12);
    const june = series[11];
    expect(june?.revenueCents).toBe(100_000);
    expect(june?.costsCents).toBe(10_000 + 5_000);
    expect(series[10]?.revenueCents).toBe(0);
  });
});

describe("pctChange", () => {
  it("variação percentual; null quando base 0", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
  });
});
