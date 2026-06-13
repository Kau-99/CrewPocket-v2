import type { Interval, Plan } from "./types";

/**
 * Preços de EXIBIÇÃO em USD (lançamento nos EUA). O valor cobrado de fato vem
 * dos Stripe Prices configurados — devem bater com estes (Solo $20, Pro $27).
 * Anual cobra ~10 meses (2 grátis).
 */
export const PLAN_PRICE_USD: Record<Plan, Record<Interval, number>> = {
  solo: { monthly: 20, annual: 200 },
  pro: { monthly: 27, annual: 270 },
};

/** "$20" — sem casas decimais (valores redondos). */
export function formatPlanPrice(plan: Plan, interval: Interval): string {
  return `$${PLAN_PRICE_USD[plan][interval]}`;
}
