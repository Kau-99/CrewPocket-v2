import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  computePnl,
  marginRows,
  payrollRows,
  revenueByTag,
  taxSummary,
  toCsv,
  type AnalyticsInvoice,
  type AnalyticsJob,
} from "../utils";

function ts(iso: string) {
  return Timestamp.fromDate(new Date(iso));
}

const YEAR_WINDOW = {
  start: new Date(2026, 0, 1).getTime(),
  end: new Date(2027, 0, 1).getTime(),
};

function job(overrides: Partial<AnalyticsJob> = {}): AnalyticsJob {
  return {
    id: "job-1",
    name: "Attic job",
    valueCents: 200_000,
    paymentStatus: "paid",
    tags: ["insulation"],
    date: ts("2026-06-10T12:00:00"),
    costs: [{ qty: 10, unitCostCents: 5_000 }],
    ...overrides,
  };
}

function invoice(overrides: Partial<AnalyticsInvoice> = {}): AnalyticsInvoice {
  return {
    jobId: "job-1",
    status: "paid",
    paidAt: ts("2026-06-12T12:00:00"),
    lineItems: [{ qty: 1, unitPriceCents: 200_000 }],
    discountPct: 0,
    taxPct: 0,
    ...overrides,
  };
}

describe("computePnl (receita − materiais − labor = lucro)", () => {
  it("considera só invoices pagas dentro do período", () => {
    const pnl = computePnl(
      [job()],
      [invoice(), invoice({ paidAt: ts("2025-06-12T12:00:00") })],
      new Map([["job-1", 30_000]]),
      YEAR_WINDOW,
    );
    expect(pnl.revenueCents).toBe(200_000);
    expect(pnl.materialsCents).toBe(50_000);
    expect(pnl.laborCents).toBe(30_000);
    expect(pnl.profitCents).toBe(120_000);
  });
});

describe("marginRows", () => {
  it("ordena pela pior margem e ignora jobs sem valor", () => {
    const rows = marginRows(
      [
        job({ id: "a", valueCents: 100_000, costs: [{ qty: 1, unitCostCents: 90_000 }] }),
        job({ id: "b", valueCents: 100_000, costs: [{ qty: 1, unitCostCents: 10_000 }] }),
        job({ id: "c", valueCents: 0 }),
      ],
      new Map(),
    );
    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(rows[0]?.marginPct).toBeCloseTo(10);
  });
});

describe("revenueByTag", () => {
  it("agrupa por tag (job conta em cada tag); sem tag → untagged", () => {
    const result = revenueByTag(
      [
        job({ tags: ["hvac", "insulation"], valueCents: 100_000 }),
        job({ id: "j2", tags: [], valueCents: 50_000 }),
        job({ id: "j3", paymentStatus: "unpaid", valueCents: 999_999 }),
      ],
      "untagged",
    );
    expect(Object.fromEntries(result)).toEqual({
      hvac: 100_000,
      insulation: 100_000,
      untagged: 50_000,
    });
  });
});

describe("payrollRows", () => {
  it("agrupa horas e custo por membro (dono usa default rate)", () => {
    const logs = [
      {
        jobId: "j",
        crewMemberId: "m1",
        crewName: "Mike",
        clockIn: ts("2026-06-10T08:00:00"),
        clockOut: ts("2026-06-10T12:00:00"),
        breakMinutes: 0,
      },
      {
        jobId: "j",
        crewMemberId: null,
        crewName: "",
        clockIn: ts("2026-06-11T08:00:00"),
        clockOut: ts("2026-06-11T10:00:00"),
        breakMinutes: 0,
      },
    ];
    const rows = payrollRows(
      logs,
      [{ id: "m1", name: "Mike", hourlyRateCents: 25_00 }],
      65_00,
      "Owner",
      YEAR_WINDOW,
    );
    expect(rows).toEqual([
      { name: "Owner", hours: 2, costCents: 2 * 65_00 },
      { name: "Mike", hours: 4, costCents: 4 * 25_00 },
    ]);
  });
});

describe("taxSummary", () => {
  it("receita do ano + materiais + milhas × rate", () => {
    const summary = taxSummary(
      [job()],
      [invoice()],
      [
        { date: ts("2026-03-01T12:00:00"), miles: 100 },
        { date: ts("2025-03-01T12:00:00"), miles: 999 }, // outro ano
      ],
      67,
      2026,
    );
    expect(summary.revenueCents).toBe(200_000);
    expect(summary.materialsCents).toBe(50_000);
    expect(summary.milesTotal).toBe(100);
    expect(summary.mileageDeductionCents).toBe(6_700);
    expect(summary.deductibleTotalCents).toBe(56_700);
  });
});

describe("toCsv", () => {
  it("escapa vírgulas, aspas e quebras de linha", () => {
    expect(
      toCsv([
        ["name", "note"],
        ['John "JJ"', "a,b"],
      ]),
    ).toBe('name,note\n"John ""JJ""","a,b"');
  });
});
