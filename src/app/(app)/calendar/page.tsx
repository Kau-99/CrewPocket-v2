"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAllJobs } from "@/features/jobs/hooks/use-jobs";
import type { Job } from "@/features/jobs/schemas";
import { useTranslation } from "@/hooks/use-translation";
import { useUiStore } from "@/hooks/use-ui-store";
import { cn, formatCents } from "@/lib/utils";

const LOCALES = { en: "en-US", es: "es-ES" } as const;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Calendário mensal de jobs (SPEC §8): agendados por data, deadlines, navegação. */
export default function CalendarPage() {
  const dict = useTranslation();
  const c = dict.calendar;
  const language = useUiStore((state) => state.language);
  const locale = LOCALES[language];
  const { data: jobs } = useAllJobs();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(() => dayKey(today));

  // jobs agrupados por dia (data agendada)
  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs ?? []) {
      const key = dayKey(job.date.toDate());
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    return map;
  }, [jobs]);

  // 6 semanas × 7 dias começando no domingo da semana do dia 1
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const weekdayNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 0, 7 + index)));
  }, [locale]);

  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    cursor,
  );
  const selectedJobs = jobsByDay.get(selected) ?? [];
  const selectedLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${selected}T12:00:00`));

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(dayKey(today));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{c.title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            {c.today}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={c.prev}
            onClick={() => {
              shiftMonth(-1);
            }}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize">{monthTitle}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label={c.next}
            onClick={() => {
              shiftMonth(1);
            }}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Grade do mês */}
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {weekdayNames.map((name) => (
            <div key={name} className="py-2 capitalize">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date) => {
            const key = dayKey(date);
            const dayJobs = jobsByDay.get(key) ?? [];
            const inMonth = date.getMonth() === cursor.getMonth();
            const isToday = key === dayKey(today);
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelected(key);
                }}
                className={cn(
                  "min-h-16 border-b border-r p-1 text-left align-top transition-colors last:border-r-0 sm:min-h-24",
                  !inMonth && "bg-muted/20 text-muted-foreground",
                  isSelected && "ring-2 ring-inset ring-primary",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayJobs.slice(0, 2).map((job) => (
                    <span
                      key={job.id}
                      className="block truncate rounded bg-primary/10 px-1 text-[10px] leading-4 text-primary"
                    >
                      {job.name}
                    </span>
                  ))}
                  {dayJobs.length > 2 && (
                    <span className="block px-1 text-[10px] text-muted-foreground">
                      {c.more.replace("{count}", String(dayJobs.length - 2))}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda do dia selecionado */}
      <section className="space-y-2">
        <h2 className="font-semibold capitalize">{selectedLabel}</h2>
        {selectedJobs.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {c.noJobsDay}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {selectedJobs.map((job) => (
              <li key={job.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                    {job.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {[job.clientName, job.scheduledTime, dict.jobs.statuses[job.status]]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{formatCents(job.valueCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
