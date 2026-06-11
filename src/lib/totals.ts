/**
 * Totais de documentos comerciais (SPEC §4.3):
 * subtotal = Σ(qty × unitPriceCents)
 * afterDiscount = subtotal × (1 − discountPct/100)
 * total = round(afterDiscount × (1 + taxPct/100)) — arredondar SÓ no fim.
 * Os parciais exibidos são arredondados de forma que a soma sempre feche.
 */
export interface LineLike {
  qty: number;
  unitPriceCents: number;
}

export interface DocumentTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

export function computeLineTotalCents(item: LineLike): number {
  return Math.round(item.qty * item.unitPriceCents);
}

export function computeDocumentTotals(
  lineItems: LineLike[],
  discountPct: number,
  taxPct: number,
): DocumentTotals {
  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
  const afterDiscount = subtotal * (1 - discountPct / 100);
  const totalCents = Math.round(afterDiscount * (1 + taxPct / 100));

  const subtotalCents = Math.round(subtotal);
  const afterDiscountCents = Math.round(afterDiscount);
  return {
    subtotalCents,
    discountCents: subtotalCents - afterDiscountCents,
    taxCents: totalCents - afterDiscountCents,
    totalCents,
  };
}
