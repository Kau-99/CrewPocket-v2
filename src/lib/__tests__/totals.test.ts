import { describe, expect, it } from "vitest";

import { computeDocumentTotals, computeLineTotalCents } from "@/lib/totals";

describe("computeDocumentTotals (SPEC §4.3)", () => {
  it("subtotal → desconto → tax, arredondando só no fim", () => {
    const totals = computeDocumentTotals(
      [
        { qty: 1, unitPriceCents: 185_000 },
        { qty: 2, unitPriceCents: 12_50 },
      ],
      10,
      8.25,
    );
    // subtotal 187500; afterDiscount 168750; total = round(168750 × 1.0825) = 182672 (182671.875)
    expect(totals.subtotalCents).toBe(187_500);
    expect(totals.discountCents).toBe(18_750);
    expect(totals.totalCents).toBe(182_672);
    // parciais sempre fecham: subtotal − desconto + tax = total
    expect(totals.subtotalCents - totals.discountCents + totals.taxCents).toBe(totals.totalCents);
  });

  it("edge: desconto 100% zera tudo", () => {
    const totals = computeDocumentTotals([{ qty: 3, unitPriceCents: 10_00 }], 100, 8.25);
    expect(totals.totalCents).toBe(0);
    expect(totals.discountCents).toBe(30_00);
    expect(totals.taxCents).toBe(0);
  });

  it("edge: lista vazia e qty 0", () => {
    expect(computeDocumentTotals([], 0, 0).totalCents).toBe(0);
    expect(computeDocumentTotals([{ qty: 0, unitPriceCents: 99_99 }], 0, 10).totalCents).toBe(0);
  });

  it("qty fracionária não perde centavos por linha", () => {
    // 1.5 × 333 = 499.5 → no fim: round(499.5) = 500
    const totals = computeDocumentTotals([{ qty: 1.5, unitPriceCents: 333 }], 0, 0);
    expect(totals.totalCents).toBe(500);
  });

  it("computeLineTotalCents arredonda a linha para exibição", () => {
    expect(computeLineTotalCents({ qty: 1.5, unitPriceCents: 333 })).toBe(500);
  });
});
