/** Tipos client-safe (lib/stripe/plans.ts é server-only por causa das envs). */
export type Plan = "solo" | "pro";
export type Interval = "monthly" | "annual";
