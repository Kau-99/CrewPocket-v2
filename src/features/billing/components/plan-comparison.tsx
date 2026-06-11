"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import { startCheckout } from "../api";
import type { Interval, Plan } from "../types";

interface PlanComparisonProps {
  /** plano ativo atual (esconde o CTA correspondente) */
  currentPlan?: Plan | null;
}

/** Comparativo Solo × Pro com checkout (SPEC §8 Billing / §6.2). */
export function PlanComparison({ currentPlan = null }: PlanComparisonProps) {
  const dict = useTranslation();
  const [interval, setInterval] = useState<Interval>("monthly");
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);

  function subscribe(plan: Plan) {
    setPendingPlan(plan);
    startCheckout(plan, interval).catch(() => {
      toast.error(dict.errors["stripe/checkout-failed"]);
      setPendingPlan(null);
    });
  }

  const plans: { plan: Plan; features: string[] }[] = [
    { plan: "solo", features: dict.billing.soloFeatures },
    { plan: "pro", features: dict.billing.proFeatures },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        {(["monthly", "annual"] as const).map((option) => (
          <Button
            key={option}
            variant={interval === option ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setInterval(option);
            }}
          >
            {dict.billing[option]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plans.map(({ plan, features }) => (
          <Card key={plan} className={cn(plan === "pro" && "border-primary")}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {dict.billing.plans[plan]}
                {currentPlan === plan && (
                  <span className="text-xs font-normal text-primary">{dict.billing.current}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {currentPlan === plan ? (
                <Button className="w-full" disabled variant="outline">
                  {dict.billing.current}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={pendingPlan !== null}
                  onClick={() => {
                    subscribe(plan);
                  }}
                >
                  {pendingPlan === plan
                    ? dict.common.loading
                    : currentPlan
                      ? dict.billing.switchPlan
                      : dict.billing.subscribe}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">{dict.billing.trialNote}</p>
    </div>
  );
}
