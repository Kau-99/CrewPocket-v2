"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

import type { MonthPoint } from "../utils";

/** Receita × custos, 12 meses (SPEC §8, Recharts). */
export function RevenueChart({ data }: { data: MonthPoint[] }) {
  const dict = useTranslation();

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-semibold">{dict.dashboard.chartTitle}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 25% 18%)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickFormatter={(value: number) => `$${Math.round(value / 100_000)}k`}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={42}
            />
            <Tooltip
              cursor={{ fill: "hsl(220 25% 15% / 0.5)" }}
              contentStyle={{
                backgroundColor: "hsl(220 30% 9%)",
                border: "1px solid hsl(220 25% 18%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                formatCents(value),
                name === "revenueCents" ? dict.dashboard.revenueSeries : dict.dashboard.costsSeries,
              ]}
            />
            <Bar dataKey="revenueCents" fill="hsl(210 100% 62%)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="costsCents" fill="hsl(220 15% 45%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
