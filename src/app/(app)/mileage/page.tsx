"use client";

import { useMemo } from "react";

import { useJobs } from "@/features/jobs/hooks/use-jobs";
import { MileageList } from "@/features/mileage/components/mileage-list";
import { useSettings } from "@/features/settings/hooks/use-settings";

export default function MileagePage() {
  const { data } = useJobs();
  const { settings } = useSettings();

  const jobOptions = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? []).map((job) => ({
        id: job.id,
        name: job.name,
      })),
    [data],
  );

  return <MileageList jobOptions={jobOptions} rateCents={settings?.mileageRateCents ?? 67} />;
}
