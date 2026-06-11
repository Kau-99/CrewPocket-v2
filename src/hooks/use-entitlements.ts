"use client";

import { useSubscription } from "@/hooks/use-subscription";

/**
 * Capabilities Solo × Pro (tabela SPEC §6.2). Gating client-side é UX;
 * a garantia real é o paywall global + subscriptions escrito só pelo servidor.
 */
export interface Entitlements {
  loading: boolean;
  /** status ∈ {active, trialing} */
  active: boolean;
  plan: "solo" | "pro" | null;
  /** Crew management: Pro */
  crewManagement: boolean;
  /** Time tracking de crew (até 5 membros): Pro; Solo = só o dono */
  crewTimeTracking: boolean;
  /** Analytics avançado (P&L, payroll): Pro */
  advancedAnalytics: boolean;
  /** Export CSV/backup: Pro */
  exportCsv: boolean;
}

export const PRO_CREW_LIMIT = 5;

export function useEntitlements(): Entitlements {
  const { subscription, loading } = useSubscription();
  const active = subscription?.status === "active" || subscription?.status === "trialing";
  const pro = active && subscription.plan === "pro";

  return {
    loading,
    active,
    plan: active ? subscription.plan : null,
    crewManagement: pro,
    crewTimeTracking: pro,
    advancedAnalytics: pro,
    exportCsv: pro,
  };
}
