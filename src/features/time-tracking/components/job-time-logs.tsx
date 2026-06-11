"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { useJobLogs } from "../hooks/use-time-logs";
import { TimeLogList } from "./time-log-list";

/** Tab "Time" do Job detail — injetada via slot pela página (ADR-015). */
export function JobTimeLogs({ jobId }: { jobId: string }) {
  const { logs, loading } = useJobLogs(jobId);

  if (loading) return <Skeleton className="h-32 w-full" />;

  return <TimeLogList logs={logs} allowDelete />;
}
