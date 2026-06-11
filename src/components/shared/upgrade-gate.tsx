"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

interface UpgradeGateProps {
  /** true = libera o conteúdo (Pro ativo) */
  allowed: boolean;
  children: ReactNode;
}

/**
 * Feature bloqueada renderiza com blur + CTA — nunca esconder
 * silenciosamente (SPEC §6.2). Gating client-side é UX; a garantia real
 * é o paywall global + rules.
 */
export function UpgradeGate({ allowed, children }: UpgradeGateProps) {
  const dict = useTranslation();

  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card/95 p-6 text-center shadow-lg">
          <Lock className="size-8 text-primary" aria-hidden="true" />
          <p className="font-semibold">{dict.upgradeGate.title}</p>
          <p className="text-sm text-muted-foreground">{dict.upgradeGate.description}</p>
          <Button asChild>
            <Link href="/billing">{dict.upgradeGate.cta}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
