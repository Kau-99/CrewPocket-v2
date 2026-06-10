import { describe, expect, it } from "vitest";

import { makeCostItem, makeJob } from "@/test/factories";

import { costItemSchema, jobSchema } from "../schemas";

describe("costItemSchema", () => {
  it("accepts a valid cost item", () => {
    expect(costItemSchema.safeParse(makeCostItem()).success).toBe(true);
  });

  it.each([
    ["name vazio", { name: "" }],
    ["name > 200", { name: "x".repeat(201) }],
    ["categoria inválida", { category: "tools" }],
    ["qty negativa", { qty: -1 }],
    ["qty > 1M", { qty: 1_000_001 }],
    ["unitCostCents float", { unitCostCents: 10.5 }],
    ["unitCostCents negativo", { unitCostCents: -1 }],
    ["unitCostCents > 1M de dólares", { unitCostCents: 1_000_000_01 }],
  ])("rejects %s", (_label, override) => {
    expect(costItemSchema.safeParse({ ...makeCostItem(), ...override }).success).toBe(false);
  });
});

describe("jobSchema", () => {
  it("accepts a valid job", () => {
    expect(jobSchema.safeParse(makeJob()).success).toBe(true);
  });

  it("applies defaults (priority, paymentStatus, depositCents, paidCents)", () => {
    const job = makeJob() as Record<string, unknown>;
    delete job.priority;
    delete job.paymentStatus;
    delete job.depositCents;
    delete job.paidCents;
    const parsed = jobSchema.parse(job);
    expect(parsed.priority).toBe("normal");
    expect(parsed.paymentStatus).toBe("unpaid");
    expect(parsed.depositCents).toBe(0);
    expect(parsed.paidCents).toBe(0);
  });

  it.each([
    ["name vazio", { name: "" }],
    ["status inválido", { status: "archived" }],
    ["priority inválida", { priority: "urgent" }],
    ["paymentStatus inválido", { paymentStatus: "due" }],
    ["clientId não-uuid", { clientId: "abc" }],
    ["valueCents float", { valueCents: 99.5 }],
    ["valueCents negativo", { valueCents: -1 }],
    ["valueCents acima do teto", { valueCents: 10_000_000_01 }],
    ["depositCents negativo", { depositCents: -1 }],
    ["tag > 30 chars", { tags: ["x".repeat(31)] }],
    ["mais de 20 tags", { tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }],
    ["mais de 100 custos", { costs: Array.from({ length: 101 }, makeCostItem) }],
    ["photoUrl inválida", { photoUrls: ["not-a-url"] }],
    ["date não-Timestamp", { date: "2026-02-01" }],
  ])("rejects %s", (_label, override) => {
    expect(jobSchema.safeParse({ ...makeJob(), ...override }).success).toBe(false);
  });
});
