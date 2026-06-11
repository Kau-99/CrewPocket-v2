"use client";

import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { auth } from "@/lib/firebase/client";

import { PlanComparison } from "./plan-comparison";

/**
 * Paywall global (SPEC §6.2): sem status ∈ {active, trialing}, o app
 * inteiro mostra isto — verificado contra o doc subscriptions que só o
 * servidor escreve.
 */
export function Paywall() {
  const dict = useTranslation();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{dict.billing.paywallTitle}</h1>
        <p className="mt-2 text-muted-foreground">{dict.billing.paywallSubtitle}</p>
      </div>
      <PlanComparison />
      <Button
        variant="ghost"
        size="sm"
        className="mx-auto text-muted-foreground"
        onClick={() => {
          void signOut(auth);
        }}
      >
        <LogOut className="mr-1 size-4" aria-hidden="true" />
        {dict.nav.signOut}
      </Button>
    </main>
  );
}
