import { describe, expect, it } from "vitest";

import { ATTIC_TABLE, computeAtticEstimate, R_VALUES } from "../utils";

describe("computeAtticEstimate (tabela SPEC §5)", () => {
  it.each([
    ["R-30", 22, 2.5],
    ["R-38", 35, 3.5],
    ["R-49", 45, 4.5],
    ["R-60", 56, 5.5],
  ] as const)("%s: 1000 sqft → %i bags, %f horas", (rValue, bags, hours) => {
    const estimate = computeAtticEstimate(1000, rValue, 45_00, 65_00);
    expect(estimate.bags).toBe(bags);
    expect(estimate.laborHours).toBeCloseTo(hours);
    expect(estimate.materialCents).toBe(bags * 45_00);
    expect(estimate.laborCents).toBe(Math.round(hours * 65_00));
    expect(estimate.totalCents).toBe(estimate.materialCents + estimate.laborCents);
  });

  it("bags arredonda para CIMA (ceil)", () => {
    // 1200 sqft × 22/k = 26.4 → 27 bags
    expect(computeAtticEstimate(1200, "R-30", 45_00, 65_00).bags).toBe(27);
  });

  it("edge: 0 sqft zera tudo", () => {
    const estimate = computeAtticEstimate(0, "R-38", 45_00, 65_00);
    expect(estimate.bags).toBe(0);
    expect(estimate.totalCents).toBe(0);
  });

  it("custos editáveis (bag e labor rate) entram no cálculo", () => {
    const estimate = computeAtticEstimate(1000, "R-30", 50_00, 80_00);
    expect(estimate.materialCents).toBe(22 * 50_00);
    expect(estimate.laborCents).toBe(Math.round(2.5 * 80_00));
  });

  it("tabela cobre todos os R-values expostos", () => {
    expect(Object.keys(ATTIC_TABLE).sort()).toEqual([...R_VALUES].sort());
  });
});
