"use client";

import { useMemo } from "react";

import { useClients } from "@/features/clients/hooks/use-clients";
import { JobsList } from "@/features/jobs/components/jobs-list";
import { useSettings } from "@/features/settings/hooks/use-settings";

// Composição cross-feature acontece na página (SPEC §3.2.1)
export default function JobsPage() {
  const { data } = useClients();
  const { settings } = useSettings();

  const clientOptions = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? [])
        .filter((client) => !client.isArchived)
        .map((client) => ({ id: client.id, name: client.name })),
    [data],
  );

  return <JobsList clientOptions={clientOptions} minMarginPct={settings?.minMarginPct ?? 20} />;
}
