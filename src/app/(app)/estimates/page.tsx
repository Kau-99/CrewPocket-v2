"use client";

import { useMemo } from "react";

import { useClients } from "@/features/clients/hooks/use-clients";
import { EstimatesList } from "@/features/estimates/components/estimates-list";
import { useSettings } from "@/features/settings/hooks/use-settings";

export default function EstimatesPage() {
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
    <EstimatesList
      clientOptions={clientOptions}
      taxPctDefault={settings?.taxPctDefault ?? 0}
      defaultTerms={settings?.defaultEstimateTerms ?? ""}
    />
  );
}
