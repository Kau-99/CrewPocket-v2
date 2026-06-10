import { describe, expect, it } from "vitest";

import { makeEstimate, makeLineItem } from "@/test/factories";

import { estimateSchema, lineItemSchema } from "../schemas";

describe("lineItemSchema", () => {
  it("accepts a valid line item", () => {
    expect(lineItemSchema.safeParse(makeLineItem()).success).toBe(true);
  });

  it.each([
    ["description vazia", { description: "" }],
    ["description > 300", { description: "x".repeat(301) }],
    ["qty negativa", { qty: -1 }],
    ["unitPriceCents float", { unitPriceCents: 9.99 }],
    ["unitPriceCents negativo", { unitPriceCents: -1 }],
  ])("rejects %s", (_label, override) => {
    expect(lineItemSchema.safeParse({ ...makeLineItem(), ...override }).success).toBe(false);
  });
});

describe("estimateSchema", () => {
  it("accepts a valid estimate", () => {
    expect(estimateSchema.safeParse(makeEstimate()).success).toBe(true);
  });

  it.each([
    ["number > 20", { number: "x".repeat(21) }],
    ["title vazio", { title: "" }],
    ["status inválido", { status: "open" }],
    ["lineItems vazio (min 1)", { lineItems: [] }],
    ["mais de 100 lineItems", { lineItems: Array.from({ length: 101 }, makeLineItem) }],
    ["discountPct > 100", { discountPct: 101 }],
    ["discountPct negativo", { discountPct: -1 }],
    ["taxPct > 30", { taxPct: 31 }],
    ["notes > 5000", { notes: "x".repeat(5001) }],
    ["validUntil não-Timestamp", { validUntil: Date.now() }],
  ])("rejects %s", (_label, override) => {
    expect(estimateSchema.safeParse({ ...makeEstimate(), ...override }).success).toBe(false);
  });
});
