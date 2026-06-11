"use client";

import { useMemo, useState } from "react";

import { useCrewMembers } from "@/features/crew/hooks/use-crew";
import { QuickCostForm } from "@/features/jobs/components/quick-cost-form";
import { useJobs } from "@/features/jobs/hooks/use-jobs";
import { FieldClock } from "@/features/time-tracking/components/field-clock";
import { TimeLogList } from "@/features/time-tracking/components/time-log-list";
import { useRecentLogs } from "@/features/time-tracking/hooks/use-time-logs";
import { useTranslation } from "@/hooks/use-translation";

/** Modo campo (SPEC §8): mobile-first, alvos de toque generosos. */
export default function FieldPage() {
  const dict = useTranslation();
  const { data } = useJobs();
  const { data: crew } = useCrewMembers();
  const recentLogs = useRecentLogs();

  const jobs = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? []).filter(
        (job) => job.status !== "invoiced" && job.status !== "completed",
      ),
    [data],
  );

  const [jobId, setJobId] = useState("");
  const [memberId, setMemberId] = useState<string | null>(null);

  // job ativo no topo: default = primeiro job "active", senão o primeiro
  const fallbackJob = jobs.find((job) => job.status === "active") ?? jobs[0];
  const effectiveJobId = jobId !== "" ? jobId : (fallbackJob?.id ?? "");
  const selectedJob = jobs.find((job) => job.id === effectiveJobId);

  const jobOptions = jobs.map((job) => ({ id: job.id, name: job.name }));
  const memberOptions = (crew ?? [])
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">{dict.field.title}</h1>

      <FieldClock
        jobOptions={jobOptions}
        memberOptions={memberOptions}
        jobId={effectiveJobId}
        onJobChange={setJobId}
        memberId={memberId}
        onMemberChange={setMemberId}
      />

      {selectedJob && <QuickCostForm job={selectedJob} />}

      <section className="space-y-2">
        <h2 className="font-semibold">{dict.time.recentLogs}</h2>
        <TimeLogList logs={recentLogs} />
      </section>
    </div>
  );
}
