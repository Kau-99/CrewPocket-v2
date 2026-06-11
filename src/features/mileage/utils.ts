/** dedução = miles × settings.mileageRateCents (SPEC §4.5), centavos inteiros. */
export function mileageDeductionCents(miles: number, rateCents: number): number {
  return Math.round(miles * rateCents);
}
