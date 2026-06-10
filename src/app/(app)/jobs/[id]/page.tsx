"use client";

import { useMemo } from "react";

import { useClients } from "@/features/clients/hooks/use-clients";
import { JobDetail } from "@/features/jobs/components/job-detail";
import { useSettings } from "@/features/settings/hooks/use-settings";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { data } = useClients();
  const { settings } = useSettings();

  const clientOptions = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? [])
        .filter((client) => !client.isArchived)
        .map((client) => ({ id: client.id, name: client.name })),
    [data],
  );

  return (
    <JobDetail
      id={params.id}
      clientOptions={clientOptions}
      minMarginPct={settings?.minMarginPct ?? 20}
    />
  );
}
