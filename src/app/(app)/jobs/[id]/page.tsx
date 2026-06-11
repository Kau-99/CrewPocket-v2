"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useCrewMembers } from "@/features/crew/hooks/use-crew";
import { ConvertJobButton } from "@/features/invoices/components/convert-job-button";
import { JobDetail } from "@/features/jobs/components/job-detail";
import { useJob } from "@/features/jobs/hooks/use-jobs";
import { jobLaborCostCents } from "@/features/jobs/utils";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { JobTimeLogs } from "@/features/time-tracking/components/job-time-logs";
import { useJobLogs } from "@/features/time-tracking/hooks/use-time-logs";
import { useTranslation } from "@/hooks/use-translation";

// Composição cross-feature: jobs + clients + crew + time + invoices (SPEC §3.2.1)
export default function JobDetailPage({ params }: { params: { id: string } }) {
  const dict = useTranslation();
  const { data } = useClients();
  const { data: crew } = useCrewMembers();
  const { settings } = useSettings();
  const { logs } = useJobLogs(params.id);
  const { job } = useJob(params.id);

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
      extraActions={
        job ? (
          <>
            {job.estimateId && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/estimates/${job.estimateId}`}>
                  <FileText className="mr-1 size-4" aria-hidden="true" />
                  {dict.jobs.viewEstimate}
                </Link>
              </Button>
            )}
            <ConvertJobButton
              job={job}
              taxPctDefault={settings?.taxPctDefault ?? 0}
              invoicePrefix={settings?.invoicePrefix ?? "INV-"}
            />
          </>
        ) : null
      }
    />
  );
}
