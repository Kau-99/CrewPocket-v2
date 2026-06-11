"use client";

import { useMemo } from "react";

import { useClients } from "@/features/clients/hooks/use-clients";
import { EstimateDetail } from "@/features/estimates/components/estimate-detail";
import { useSettings } from "@/features/settings/hooks/use-settings";

export default function EstimateDetailPage({ params }: { params: { id: string } }) {
  const { data } = useClients();
  const { settings } = useSettings();

  const clientOptions = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? [])
        .filter((client) => !client.isArchived)
        .map((client) => ({ id: client.id, name: client.name, email: client.email })),
    [data],
  );

  return (
    <EstimateDetail
      id={params.id}
      clientOptions={clientOptions}
      company={{
        name: settings?.companyName ?? "",
        address: settings?.companyAddress ?? "",
        phone: settings?.companyPhone ?? "",
        email: settings?.companyEmail ?? "",
        logoUrl: settings?.logoUrl ?? null,
      }}
    />
  );
}
