/**
 * Attic Estimator (SPEC §5) — tabela fixa por 1.000 sqft:
 * bags = ceil(sqft/1000 × bagsPerK); labor = sqft/1000 × hrsPerK
 * materialCents = bags × bagCostCents; laborCents = labor × laborRateCents
 */
export const R_VALUES = ["R-30", "R-38", "R-49", "R-60"] as const;
export type RValue = (typeof R_VALUES)[number];

export const ATTIC_TABLE: Record<RValue, { bagsPerK: number; hoursPerK: number }> = {
  "R-30": { bagsPerK: 22, hoursPerK: 2.5 },
  "R-38": { bagsPerK: 35, hoursPerK: 3.5 },
  "R-49": { bagsPerK: 45, hoursPerK: 4.5 },
  "R-60": { bagsPerK: 56, hoursPerK: 5.5 },
};

export const DEFAULT_BAG_COST_CENTS = 45_00;

export interface AtticEstimate {
  bags: number;
  laborHours: number;
  materialCents: number;
  laborCents: number;
  totalCents: number;
}

export function computeAtticEstimate(
  sqft: number,
  rValue: RValue,
  bagCostCents: number,
  laborRateCents: number,
): AtticEstimate {
  const { bagsPerK, hoursPerK } = ATTIC_TABLE[rValue];
  const bags = Math.ceil((sqft / 1000) * bagsPerK);
  const laborHours = (sqft / 1000) * hoursPerK;
  const materialCents = bags * bagCostCents;
  const laborCents = Math.round(laborHours * laborRateCents);
  return {
    bags,
    laborHours,
    materialCents,
    laborCents,
    totalCents: materialCents + laborCents,
  };
}
