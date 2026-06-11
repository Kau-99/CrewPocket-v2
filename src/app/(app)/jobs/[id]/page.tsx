"use client";

import { useMemo } from "react";

import { useClients } from "@/features/clients/hooks/use-clients";
import { useCrewMembers } from "@/features/crew/hooks/use-crew";
import { JobDetail } from "@/features/jobs/components/job-detail";
import { jobLaborCostCents } from "@/features/jobs/utils";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { JobTimeLogs } from "@/features/time-tracking/components/job-time-logs";
import { useJobLogs } from "@/features/time-tracking/hooks/use-time-logs";

// Composição cross-feature: jobs + clients + crew + time-tracking (SPEC §3.2.1)
export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { data } = useClients();
  const { data: crew } = useCrewMembers();
  const { settings } = useSettings();
  const { logs } = useJobLogs(params.id);

  const clientOptions = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? [])
        .filter((client) => !client.isArchived)
        .map((client) => ({ id: client.id, name: client.name })),
    [data],
  );

  const laborCostCents = jobLaborCostCents(
    logs,
    (crew ?? []).map((member) => ({ id: member.id, hourlyRateCents: member.hourlyRateCents })),
    settings?.defaultLaborRateCents ?? 65_00,
  );

  return (
    <JobDetail
      id={params.id}
      clientOptions={clientOptions}
      minMarginPct={settings?.minMarginPct ?? 20}
      laborCostCents={laborCostCents}
      timeTab={<JobTimeLogs jobId={params.id} />}
    />
  );
}
