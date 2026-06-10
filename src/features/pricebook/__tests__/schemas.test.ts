import { describe, expect, it } from "vitest";

import { makePricebookItem } from "@/test/factories";

import { pricebookItemSchema } from "../schemas";

describe("pricebookItemSchema", () => {
  it("accepts a valid pricebook item", () => {
    expect(pricebookItemSchema.safeParse(makePricebookItem()).success).toBe(true);
  });

  it.each([
    ["name vazio", { name: "" }],
    ["unitPriceCents float", { unitPriceCents: 1.5 }],
    ["unitPriceCents negativo", { unitPriceCents: -1 }],
    ["unitCostCents negativo", { unitCostCents: -1 }],
    ["description > 500", { description: "x".repeat(501) }],
  ])("rejects %s", (_label, override) => {
    expect(pricebookItemSchema.safeParse({ ...makePricebookItem(), ...override }).success).toBe(
      false,
    );
  });
});
