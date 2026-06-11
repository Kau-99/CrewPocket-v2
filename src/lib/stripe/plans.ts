import { env } from "@/env";

/** Mapeamento price ID ↔ plano/intervalo via env (SPEC §6.1 item 4). */
export type Plan = "solo" | "pro";
export type Interval = "monthly" | "annual";

export function priceIdFor(plan: Plan, interval: Interval): string {
  const prices: Record<Plan, Record<Interval, string>> = {
    solo: { monthly: env.STRIPE_PRICE_SOLO_MONTHLY, annual: env.STRIPE_PRICE_SOLO_ANNUAL },
    pro: { monthly: env.STRIPE_PRICE_PRO_MONTHLY, annual: env.STRIPE_PRICE_PRO_ANNUAL },
  };
  return prices[plan][interval];
}

export function planFromPriceId(priceId: string): { plan: Plan; interval: Interval } | null {
  const entries: [Plan, Interval][] = [
    ["solo", "monthly"],
    ["solo", "annual"],
    ["pro", "monthly"],
    ["pro", "annual"],
  ];
  for (const [plan, interval] of entries) {
    if (priceIdFor(plan, interval) === priceId) return { plan, interval };
  }
  return null;
}
