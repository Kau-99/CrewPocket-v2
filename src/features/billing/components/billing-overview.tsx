"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

import { openBillingPortal } from "../api";
import type { Subscription } from "../schemas";

/** Plano atual, status, próximo ciclo e Manage (SPEC §8 Billing). */
export function BillingOverview({ subscription }: { subscription: Subscription }) {
  const dict = useTranslation();
  const [pending, setPending] = useState(false);

  function handlePortal() {
    setPending(true);
    openBillingPortal().catch(() => {
      toast.error(dict.errors["stripe/portal-failed"]);
      setPending(false);
    });
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{dict.billing.currentPlan}</p>
          <p className="text-lg font-semibold">
            {dict.billing.plans[subscription.plan]} · {dict.billing[subscription.interval]}
          </p>
        </div>
        <Badge variant="secondary">{dict.billing.statuses[subscription.status]}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {dict.billing.nextRenewal}:{" "}
        <span className="text-foreground">
          {subscription.currentPeriodEnd.toDate().toLocaleDateString()}
        </span>
        {subscription.cancelAtPeriodEnd && ` — ${dict.billing.cancelsAtPeriodEnd}`}
      </p>
      <Button variant="outline" disabled={pending} onClick={handlePortal}>
        <ExternalLink className="mr-1 size-4" aria-hidden="true" />
        {pending ? dict.common.loading : dict.billing.manage}
      </Button>
    </section>
  );
}
