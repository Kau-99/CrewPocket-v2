"use client";

import { BillingOverview } from "@/features/billing/components/billing-overview";
import { PlanComparison } from "@/features/billing/components/plan-comparison";
import { useSubscription } from "@/hooks/use-subscription";
import { useTranslation } from "@/hooks/use-translation";

export default function BillingPage() {
  const dict = useTranslation();
  const { subscription } = useSubscription();
  const active = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{dict.billing.title}</h1>
      {subscription && <BillingOverview subscription={subscription} />}
      <PlanComparison currentPlan={active ? subscription.plan : null} />
    </div>
  );
}
