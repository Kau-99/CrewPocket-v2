import { describe, expect, it } from "vitest";

import { makeInventoryItem } from "@/test/factories";

import { inventoryItemSchema } from "../schemas";

describe("inventoryItemSchema", () => {
  it("accepts a valid item and defaults minStock to 0", () => {
    expect(inventoryItemSchema.safeParse(makeInventoryItem()).success).toBe(true);

    const item = makeInventoryItem() as Record<string, unknown>;
    delete item.minStock;
    expect(inventoryItemSchema.parse(item).minStock).toBe(0);
  });

  it.each([
    ["name vazio", { name: "" }],
    ["category > 60", { category: "x".repeat(61) }],
    ["quantity negativa", { quantity: -1 }],
    ["unit > 20", { unit: "x".repeat(21) }],
    ["unitCostCents float", { unitCostCents: 1.5 }],
    ["supplier > 120", { supplier: "x".repeat(121) }],
    ["minStock negativo", { minStock: -1 }],
  ])("rejects %s", (_label, override) => {
    expect(inventoryItemSchema.safeParse({ ...makeInventoryItem(), ...override }).success).toBe(
      false,
    );
  });
});
