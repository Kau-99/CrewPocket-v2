import { describe, expect, it } from "vitest";

import { makeInvoice, makeLineItem } from "@/test/factories";

import { invoiceSchema } from "../schemas";

describe("invoiceSchema", () => {
  it("accepts a valid invoice", () => {
    expect(invoiceSchema.safeParse(makeInvoice()).success).toBe(true);
  });

  it.each([
    ["number > 20", { number: "x".repeat(21) }],
    ["jobId não-uuid", { jobId: "abc" }],
    ["status inválido", { status: "open" }],
    ["lineItems vazio (min 1)", { lineItems: [] }],
    ["lineItem com qty negativa", { lineItems: [{ ...makeLineItem(), qty: -1 }] }],
    ["discountPct > 100", { discountPct: 101 }],
    ["taxPct > 30", { taxPct: 31 }],
    ["paidCents float", { paidCents: 0.5 }],
    ["paidCents negativo", { paidCents: -1 }],
    ["dueDate não-Timestamp", { dueDate: "2026-03-15" }],
  ])("rejects %s", (_label, override) => {
    expect(invoiceSchema.safeParse({ ...makeInvoice(), ...override }).success).toBe(false);
  });
});
