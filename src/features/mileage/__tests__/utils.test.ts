import { describe, expect, it } from "vitest";

import { mileageDeductionCents } from "../utils";

describe("mileageDeductionCents", () => {
  it("dedução = miles × rate, arredondada para centavo inteiro", () => {
    expect(mileageDeductionCents(100, 67)).toBe(6_700);
    expect(mileageDeductionCents(24.6, 67)).toBe(1_648); // 1648.2 → 1648
    expect(mileageDeductionCents(0, 67)).toBe(0);
  });

  it("rate editável em settings (não fixa em 67)", () => {
    expect(mileageDeductionCents(10, 70)).toBe(700);
  });
});
