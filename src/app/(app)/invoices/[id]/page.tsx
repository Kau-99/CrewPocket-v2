"use client";

import { useMemo } from "react";

import { useClients } from "@/features/clients/hooks/use-clients";
import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";
import { useInvoice } from "@/features/invoices/hooks/use-invoices";
import { useSettings } from "@/features/settings/hooks/use-settings";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const { data } = useClients();
  const { settings } = useSettings();
  const { invoice } = useInvoice(params.id);

  const clientEmail = useMemo(() => {
    const clients = data?.pages.flatMap((page) => page.items) ?? [];
    return clients.find((client) => client.id === invoice?.clientId)?.email ?? null;
  }, [data, invoice?.clientId]);

  return (
    <InvoiceDetail
      id={params.id}
      clientEmail={clientEmail}
      paymentInstructions={settings?.paymentInstructions ?? ""}
      company={{
        name: settings?.companyName ?? "",
        address: settings?.companyAddress ?? "",
        phone: settings?.companyPhone ?? "",
        email: settings?.companyEmail ?? "",
        logoUrl: settings?.logoUrl ?? null,
        website: settings?.website ?? "",
        taxId: settings?.taxId ?? "",
        licenseNumber: settings?.licenseNumber ?? "",
      }}
    />
  );
}
