"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { List } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import { cn, formatCents } from "@/lib/utils";

import { useJobMutations, useJobs } from "../hooks/use-jobs";
import { jobStatusSchema, type Job, type JobStatus } from "../schemas";
import { canTransition } from "../utils";

function BoardCard({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={
        transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
      }
      className={cn(
        "cursor-grab touch-none rounded-md border bg-card p-3 shadow-sm",
        isDragging && "z-50 opacity-80",
      )}
    >
      <Link
        href={`/jobs/${job.id}`}
        className="block truncate text-sm font-medium hover:underline"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {job.name}
      </Link>
      <p className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span className="truncate">{job.clientName || "—"}</span>
        <span className="tabular-nums">{formatCents(job.valueCents)}</span>
      </p>
    </div>
  );
}

function BoardColumn({ status, jobs }: { status: JobStatus; jobs: Job[] }) {
  const dict = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-3",
        isOver && "ring-2 ring-primary",
      )}
    >
      <h2 className="flex items-center justify-between text-sm font-semibold">
        {dict.jobs.statuses[status]}
        <span className="text-xs font-normal text-muted-foreground">{jobs.length}</span>
      </h2>
      {jobs.map((job) => (
        <BoardCard key={job.id} job={job} />
      ))}
    </div>
  );
}

/** Kanban drag-and-drop respeitando a máquina de estados (SPEC §8). */
export function JobBoard() {
  const dict = useTranslation();
  const { data, isLoading } = useJobs();
  const { changeStatus } = useJobMutations();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const jobs = data?.pages.flatMap((page) => page.items) ?? [];
    const groups = new Map<JobStatus, Job[]>(jobStatusSchema.options.map((status) => [status, []]));
    for (const job of jobs) groups.get(job.status)?.push(job);
    return groups;
  }, [data]);

  function onDragEnd(event: DragEndEvent) {
    const job = event.active.data.current?.job as Job | undefined;
    const to = event.over?.id as JobStatus | undefined;
    if (!job || !to || job.status === to) return;

    if (!canTransition(job.status, to)) {
      toast.error(dict.jobs.invalidTransition);
      return;
    }
    changeStatus.mutate(
      { job, to },
      {
        onSuccess: () => toast.success(dict.jobs.statusUpdated),
        onError: () => toast.error(dict.errors.unknown),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.jobs.board}</h1>
        <Button variant="outline" className="ml-auto" asChild>
          <Link href="/jobs">
            <List className="mr-1 size-4" aria-hidden="true" />
            {dict.jobs.listView}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-64 shrink-0" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {jobStatusSchema.options.map((status) => (
              <BoardColumn key={status} status={status} jobs={byStatus.get(status) ?? []} />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
