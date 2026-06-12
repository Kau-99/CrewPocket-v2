"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export interface KpiItem {
  label: string;
  value: string;
  /** variação % vs mês anterior; null = sem comparativo */
  change: number | null;
  /** margem abaixo do mínimo etc. */
  alert?: boolean;
}

/** 4 KPI cards com comparativo vs mês anterior (SPEC §8). */
export function KpiCards({ items }: { items: KpiItem[] }) {
  const dict = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-xl font-semibold tabular-nums sm:text-2xl",
                item.alert && "text-red-500",
              )}
            >
              {item.value}
            </p>
            {item.change !== null && (
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs",
                  item.change >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {item.change >= 0 ? (
                  <TrendingUp className="size-3.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-3.5" aria-hidden="true" />
                )}
                {item.change >= 0 ? "+" : ""}
                {item.change.toFixed(0)}% {dict.dashboard.vsLastMonth}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
