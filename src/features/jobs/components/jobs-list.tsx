"use client";

import { Briefcase, Kanban, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { useTranslation } from "@/hooks/use-translation";
import { cn, formatCents } from "@/lib/utils";

import { useJobs } from "../hooks/use-jobs";
import { jobStatusSchema, type Job, type JobStatus } from "../schemas";
import { jobMarginPct, jobTotalCostCents } from "../utils";
import { JobFormDialog, type ClientOption, type CrewOption } from "./job-form-dialog";
import { JobStatusBadge } from "./job-status-badge";

interface JobsListProps {
  clientOptions: ClientOption[];
  crewOptions: CrewOption[];
  /** settings.minMarginPct — margem abaixo disso fica vermelha (SPEC §8). */
  minMarginPct: number;
}

const ALL = "all";

function marginOf(job: Job): number {
  return jobMarginPct(job.valueCents, jobTotalCostCents(job));
}

export function JobsList({ clientOptions, crewOptions, minMarginPct }: JobsListProps) {
  const dict = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useJobs();
  useNewShortcut(() => {
    setFormOpen(true);
  });

  const allJobs = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const visible = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return allJobs
      .filter((job) => statusFilter === ALL || job.status === statusFilter)
      .filter(
        (job) =>
          term === "" ||
          job.name.toLowerCase().includes(term) ||
          job.clientName.toLowerCase().includes(term) ||
          job.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
  }, [allJobs, debouncedSearch, statusFilter]);

  function marginCell(job: Job) {
    const pct = marginOf(job);
    return (
      <span className={cn("tabular-nums", pct < minMarginPct && "font-medium text-red-500")}>
        {pct.toFixed(0)}%
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.jobs.title}</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/jobs/board">
              <Kanban className="mr-1 size-4" aria-hidden="true" />
              {dict.jobs.board}
            </Link>
          </Button>
          <Button
            onClick={() => {
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {dict.jobs.new}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          placeholder={dict.jobs.search}
          className="max-w-xs"
          aria-label={dict.jobs.search}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" aria-label={dict.jobs.fields.status}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{dict.jobs.allStatuses}</SelectItem>
            {jobStatusSchema.options.map((status: JobStatus) => (
              <SelectItem key={status} value={status}>
                {dict.jobs.statuses[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : allJobs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <Briefcase className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.jobs.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.jobs.emptyCta}</p>
          <Button
            onClick={() => {
              setFormOpen(true);
            }}
          >
            {dict.jobs.new}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{dict.common.noResults}</p>
      ) : (
        <>
          {/* Tabela ≥ md */}
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.jobs.fields.name}</TableHead>
                  <TableHead>{dict.jobs.fields.client}</TableHead>
                  <TableHead>{dict.jobs.fields.status}</TableHead>
                  <TableHead>{dict.jobs.fields.date}</TableHead>
                  <TableHead className="text-right">{dict.jobs.fields.value}</TableHead>
                  <TableHead className="text-right">{dict.jobs.summary.margin}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                        {job.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{job.clientName || "—"}</TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.date.toDate().toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(job.valueCents)}
                    </TableCell>
                    <TableCell className="text-right">{marginCell(job)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards < md */}
          <ul className="space-y-2 md:hidden">
            {visible.map((job) => (
              <li key={job.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                    {job.name}
                  </Link>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[job.clientName, job.date.toDate().toLocaleDateString()]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-2 flex justify-between text-sm">
                  <span className="tabular-nums">{formatCents(job.valueCents)}</span>
                  {marginCell(job)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? dict.common.loading : dict.common.loadMore}
          </Button>
        </div>
      )}

      <JobFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clientOptions={clientOptions}
        crewOptions={crewOptions}
      />
    </div>
  );
}
