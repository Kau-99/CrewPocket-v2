"use client";

import { Car, MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

import { useMileageLogs, useMileageMutations } from "../hooks/use-mileage";
import type { MileageLog } from "../schemas";
import { mileageDeductionCents } from "../utils";
import { MileageFormDialog, type JobOption } from "./mileage-form-dialog";

interface MileageListProps {
  jobOptions: JobOption[];
  /** settings.mileageRateCents (default 67¢/mi). */
  rateCents: number;
}

export function MileageList({ jobOptions, rateCents }: MileageListProps) {
  const dict = useTranslation();
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMileageLogs();
  const { remove, undoRemove } = useMileageMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MileageLog | undefined>(undefined);

  const logs = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const totalMiles = useMemo(() => logs.reduce((sum, log) => sum + log.miles, 0), [logs]);

  function handleDelete(log: MileageLog) {
    remove.mutate(log, {
      onSuccess: () => {
        toast(dict.mileage.deletedToast, {
          duration: 5000,
          action: {
            label: dict.common.undo,
            onClick: () => {
              undoRemove.mutate(log);
            },
          },
        });
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.mileage.title}</h1>
        <Button
          className="ml-auto"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {dict.mileage.new}
        </Button>
      </div>

      {logs.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {dict.mileage.loadedTotal}:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {totalMiles.toFixed(1)} mi · {formatCents(mileageDeductionCents(totalMiles, rateCents))}
          </span>
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <Car className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.mileage.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.mileage.emptyCta}</p>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            {dict.mileage.new}
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {logs.map((log) => (
            <li key={log.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{log.purpose || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {log.date.toDate().toLocaleDateString()}
                </p>
              </div>
              <span className="text-sm tabular-nums">{log.miles.toFixed(1)} mi</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatCents(mileageDeductionCents(log.miles, rateCents))}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={dict.common.edit}>
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditing(log);
                      setFormOpen(true);
                    }}
                  >
                    {dict.common.edit}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => {
                      handleDelete(log);
                    }}
                  >
                    {dict.common.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
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

      <MileageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        log={editing}
        jobOptions={jobOptions}
      />
    </div>
  );
}
