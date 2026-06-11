import { describe, expect, it } from "vitest";

import { isLowStock } from "../utils";

describe("isLowStock (SPEC §5: quantity ≤ minStock → alerta)", () => {
  it("alerta quando quantity ≤ minStock", () => {
    expect(isLowStock({ quantity: 5, minStock: 10 })).toBe(true);
    expect(isLowStock({ quantity: 10, minStock: 10 })).toBe(true);
  });

  it("não alerta acima do mínimo (e minStock 0 só alerta zerado)", () => {
    expect(isLowStock({ quantity: 11, minStock: 10 })).toBe(false);
    expect(isLowStock({ quantity: 1, minStock: 0 })).toBe(false);
    expect(isLowStock({ quantity: 0, minStock: 0 })).toBe(true);
  });
});
