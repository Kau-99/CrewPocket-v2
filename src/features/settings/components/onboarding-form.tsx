"use client";

import { HardHat, Snowflake, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import { createSettings } from "../api";
import type { Trade } from "../schemas";

const TRADES: { value: Trade; icon: LucideIcon }[] = [
  { value: "insulation", icon: Snowflake },
  { value: "construction", icon: HardHat },
  { value: "electrical", icon: Zap },
];

/** Onboarding do primeiro login: nome da empresa + nicho (SPEC §11 Fase 1). */
export function OnboardingForm() {
  const dict = useTranslation();
  const o = dict.onboarding;
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [trade, setTrade] = useState<Trade>("insulation");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    if (!companyName.trim()) {
      toast.error(dict.forms.companyNameRequired);
      return;
    }
    setSubmitting(true);
    try {
      await createSettings(user.uid, companyName, trade);
      // o onSnapshot de useSettings troca a tela sozinho
    } catch {
      toast.error(dict.errors.unknown);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{o.title}</CardTitle>
          <CardDescription>{o.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ob-company">{o.companyName}</Label>
              <Input
                id="ob-company"
                autoFocus
                placeholder={o.companyNamePlaceholder}
                value={companyName}
                onChange={(event) => {
                  setCompanyName(event.target.value);
                }}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{o.tradeLabel}</legend>
              <p className="text-xs text-muted-foreground">{o.tradeHint}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TRADES.map(({ value, icon: Icon }) => {
                  const selected = trade === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setTrade(value);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-accent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-6",
                          selected ? "text-primary" : "text-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium">{o.trades[value]}</span>
                      <span className="text-xs text-muted-foreground">{o.tradeDesc[value]}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? dict.common.loading : o.getStarted}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
