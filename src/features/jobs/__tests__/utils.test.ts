import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { makeCostItem, makeJob } from "@/test/factories";

import type { JobStatus } from "../schemas";
import {
  allowedTransitions,
  balanceDueCents,
  canTransition,
  jobLaborCostCents,
  jobMarginCents,
  jobMarginPct,
  jobRealCostCents,
  jobTotalCostCents,
  timeLogHours,
} from "../utils";

function ts(iso: string) {
  return Timestamp.fromDate(new Date(iso));
}

describe("jobTotalCostCents", () => {
  it("soma qty × unitCostCents", () => {
    const job = {
      costs: [
        { ...makeCostItem(), qty: 22, unitCostCents: 45_00 },
        { ...makeCostItem(), qty: 2, unitCostCents: 12_50 },
      ],
    };
    expect(jobTotalCostCents(job)).toBe(22 * 45_00 + 2 * 12_50);
  });

  it("edge: sem custos e qty 0", () => {
    expect(jobTotalCostCents({ costs: [] })).toBe(0);
    expect(jobTotalCostCents({ costs: [{ ...makeCostItem(), qty: 0 }] })).toBe(0);
  });

  it("arredonda uma única vez no total (qty fracionária)", () => {
    // 1.5 × 333 = 499.5 → 500 (e não 499 ou 0.5 perdido por item)
    expect(
      jobTotalCostCents({ costs: [{ ...makeCostItem(), qty: 1.5, unitCostCents: 333 }] }),
    ).toBe(500);
  });
});

describe("timeLogHours", () => {
  const base = { crewMemberId: null, breakMinutes: 0, note: "" };

  it("calcula horas descontando o break", () => {
    const log = {
      ...base,
      clockIn: ts("2026-02-01T13:00:00Z"),
      clockOut: ts("2026-02-01T17:30:00Z"),
      breakMinutes: 30,
    };
    expect(timeLogHours(log)).toBe(4);
  });

  it("timer aberto (clockOut null) conta 0", () => {
    expect(timeLogHours({ ...base, clockIn: ts("2026-02-01T13:00:00Z"), clockOut: null })).toBe(0);
  });

  it("nunca retorna negativo (break maior que o turno)", () => {
    const log = {
      ...base,
      clockIn: ts("2026-02-01T13:00:00Z"),
      clockOut: ts("2026-02-01T13:10:00Z"),
      breakMinutes: 60,
    };
    expect(timeLogHours(log)).toBe(0);
  });
});

describe("jobLaborCostCents", () => {
  const logs = [
    {
      crewMemberId: "m1",
      clockIn: ts("2026-02-01T08:00:00Z"),
      clockOut: ts("2026-02-01T12:00:00Z"),
      breakMinutes: 0,
    },
    {
      crewMemberId: null, // dono → default rate
      clockIn: ts("2026-02-01T08:00:00Z"),
      clockOut: ts("2026-02-01T10:00:00Z"),
      breakMinutes: 0,
    },
  ];
  const crew = [{ id: "m1", hourlyRateCents: 25_00 }];

  it("usa a taxa do membro e a default para o dono", () => {
    expect(jobLaborCostCents(logs, crew, 65_00)).toBe(4 * 25_00 + 2 * 65_00);
  });

  it("membro desconhecido cai na default rate", () => {
    expect(jobLaborCostCents([logs[0]!], [], 65_00)).toBe(4 * 65_00);
  });
});

describe("margens e saldo (SPEC §5)", () => {
  it("jobRealCost = materiais + labor; margem derivada", () => {
    const job = { costs: [{ ...makeCostItem(), qty: 10, unitCostCents: 10_00 }] };
    const real = jobRealCostCents(job, [], [], 65_00);
    expect(real).toBe(100_00);
    expect(jobMarginCents(250_00, real)).toBe(150_00);
    expect(jobMarginPct(250_00, real)).toBe(60);
  });

  it("edge: value 0 → marginPct 0 (não divide por zero)", () => {
    expect(jobMarginPct(0, 100_00)).toBe(0);
  });

  it("balanceDue nunca negativo", () => {
    expect(
      balanceDueCents({ ...makeJob(), valueCents: 100_00, paidCents: 30_00, depositCents: 20_00 }),
    ).toBe(50_00);
    expect(
      balanceDueCents({ ...makeJob(), valueCents: 100_00, paidCents: 90_00, depositCents: 20_00 }),
    ).toBe(0);
  });
});

describe("máquina de estados do Job (SPEC §4.2)", () => {
  it.each([
    ["lead", "quoted", true],
    ["quoted", "draft", true],
    ["draft", "active", true],
    ["active", "completed", true],
    ["completed", "invoiced", true],
    // voltar 1 passo
    ["quoted", "lead", true],
    ["invoiced", "completed", true],
    // lead/quoted → draft direto
    ["lead", "draft", true],
    // proibidos
    ["lead", "active", false],
    ["lead", "invoiced", false],
    ["quoted", "active", false],
    ["draft", "completed", false],
    ["invoiced", "lead", false],
    ["invoiced", "active", false],
    ["active", "lead", false],
    ["lead", "lead", false],
  ] as [JobStatus, JobStatus, boolean][])("%s → %s = %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it("invoiced é terminal exceto completed", () => {
    expect(allowedTransitions("invoiced")).toEqual(["completed"]);
  });

  it("lead pode ir para quoted e draft", () => {
    expect(allowedTransitions("lead")).toEqual(["quoted", "draft"]);
  });
});
