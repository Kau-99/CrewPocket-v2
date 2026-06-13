"use client";

import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/use-translation";
import { cn, formatCents } from "@/lib/utils";

import { useJob, useJobMutations } from "../hooks/use-jobs";
import type { Job } from "../schemas";
import {
  allowedTransitions,
  balanceDueCents,
  jobMarginCents,
  jobMarginPct,
  jobTotalCostCents,
} from "../utils";
import { JobChecklist } from "./job-checklist";
import { JobCostsEditor } from "./job-costs-editor";
import { JobFormDialog, type ClientOption, type CrewOption } from "./job-form-dialog";
import { JobPhotos } from "./job-photos";
import { JobStatusBadge } from "./job-status-badge";

interface JobDetailProps {
  id: string;
  clientOptions: ClientOption[];
  crewOptions: CrewOption[];
  minMarginPct: number;
  /** Σ horas × rate dos timeLogs — calculado pela página (features são ilhas). */
  laborCostCents: number;
  /** Conteúdo da tab Time, injetado via slot pela página (ADR-015). */
  timeTab: ReactNode;
  /** Ações extras (ex.: Create invoice, View estimate) — slot da página. */
  extraActions?: ReactNode;
}

function DetailsCard({ job, crewOptions }: { job: Job; crewOptions: CrewOption[] }) {
  const dict = useTranslation();
  const f = dict.jobs.fields;
  const crewNames = job.crewIds
    .map((id) => crewOptions.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const location = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

  const rows: [string, string][] = [
    [f.serviceType, job.serviceType],
    [f.scheduledTime, job.scheduledTime],
    [f.areaSqft, job.areaSqft ? job.areaSqft.toLocaleString() : ""],
    [dict.jobs.fields.address, location],
    [f.siteContactName, [job.siteContactName, job.siteContactPhone].filter(Boolean).join(" · ")],
    [f.referralSource, job.referralSource],
    [f.deadline, job.deadline ? job.deadline.toDate().toLocaleDateString() : ""],
    [f.crew, crewNames.join(", ")],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  if (rows.length === 0) return null;

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-semibold">{dict.jobs.tabs.overview}</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SummaryCard({
  job,
  minMarginPct,
  laborCostCents,
}: {
  job: Job;
  minMarginPct: number;
  laborCostCents: number;
}) {
  const dict = useTranslation();
  const labels = dict.jobs.summary;
  const materials = jobTotalCostCents(job);
  const realCost = materials + laborCostCents;
  const marginPct = jobMarginPct(job.valueCents, realCost);

  const rows: [string, string, boolean][] = [
    [labels.value, formatCents(job.valueCents), false],
    [labels.materials, formatCents(materials), false],
    [labels.labor, formatCents(laborCostCents), false],
    [
      labels.margin,
      `${formatCents(jobMarginCents(job.valueCents, realCost))} (${marginPct.toFixed(0)}%)`,
      marginPct < minMarginPct,
    ],
    [labels.balanceDue, formatCents(balanceDueCents(job)), false],
  ];

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-semibold">{labels.title}</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {rows.map(([label, value, alert]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("text-sm font-medium tabular-nums", alert && "text-red-500")}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function JobDetail({
  id,
  clientOptions,
  crewOptions,
  minMarginPct,
  laborCostCents,
  timeTab,
  extraActions,
}: JobDetailProps) {
  const dict = useTranslation();
  const router = useRouter();
  const { job, loading } = useJob(id);
  const { changeStatus, remove, undoRemove } = useJobMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job) {
    return <p className="p-6 text-center text-muted-foreground">{dict.jobs.notFound}</p>;
  }

  function handleDelete(target: Job) {
    remove.mutate(target, {
      onSuccess: () => {
        router.push("/jobs");
        toast(dict.jobs.deletedToast, {
          duration: 5000,
          action: {
            label: dict.common.undo,
            onClick: () => {
              undoRemove.mutate(target);
            },
          },
        });
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{job.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[job.clientName, job.address].filter(Boolean).join(" · ")}
          </p>
        </div>
        {extraActions}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditOpen(true);
          }}
        >
          <Pencil className="mr-1 size-4" aria-hidden="true" />
          {dict.common.edit}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => {
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="mr-1 size-4" aria-hidden="true" />
          {dict.common.delete}
        </Button>
      </div>

      {/* Stepper de status: transições permitidas pela máquina de estados */}
      <div className="flex flex-wrap items-center gap-2">
        <JobStatusBadge status={job.status} />
        {allowedTransitions(job.status).map((to) => (
          <Button
            key={to}
            variant="outline"
            size="sm"
            disabled={changeStatus.isPending}
            onClick={() => {
              changeStatus.mutate(
                { job, to },
                {
                  onSuccess: () => toast.success(dict.jobs.statusUpdated),
                  onError: () => toast.error(dict.jobs.invalidTransition),
                },
              );
            }}
          >
            <ArrowRight className="mr-1 size-3" aria-hidden="true" />
            {dict.jobs.statuses[to]}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{dict.jobs.tabs.overview}</TabsTrigger>
          <TabsTrigger value="time">{dict.jobs.tabs.time}</TabsTrigger>
          <TabsTrigger value="photos">{dict.jobs.tabs.photos}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <SummaryCard job={job} minMarginPct={minMarginPct} laborCostCents={laborCostCents} />
          <DetailsCard job={job} crewOptions={crewOptions} />
          <JobChecklist job={job} />
          <JobCostsEditor job={job} />
          {job.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>
          )}
        </TabsContent>
        <TabsContent value="time">{timeTab}</TabsContent>
        <TabsContent value="photos">
          <JobPhotos job={job} />
        </TabsContent>
      </Tabs>

      <JobFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        job={job}
        clientOptions={clientOptions}
        crewOptions={crewOptions}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.jobs.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dict.jobs.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete(job);
              }}
            >
              {dict.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
