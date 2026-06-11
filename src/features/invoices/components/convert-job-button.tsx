"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

import type { ConvertibleJob } from "../api";
import { useInvoiceMutations } from "../hooks/use-invoices";

interface ConvertJobButtonProps {
  job: ConvertibleJob;
  taxPctDefault: number;
  invoicePrefix: string;
}

/**
 * "Create invoice" no Job detail (injetado via slot pela página, ADR-015).
 * Só converte job completed sem invoice (máquina de estados §4.2).
 */
export function ConvertJobButton({ job, taxPctDefault, invoicePrefix }: ConvertJobButtonProps) {
  const dict = useTranslation();
  const router = useRouter();
  const { createFromJob } = useInvoiceMutations();

  if (job.invoiceId) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/invoices/${job.invoiceId}`}>
          <Receipt className="mr-1 size-4" aria-hidden="true" />
          {dict.jobs.viewInvoice}
        </Link>
      </Button>
    );
  }

  if (job.status !== "completed") return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={createFromJob.isPending}
      onClick={() => {
        createFromJob.mutate(
          { job, taxPctDefault, invoicePrefix },
          {
            onSuccess: (invoiceId) => {
              toast.success(dict.jobs.invoiceCreatedToast);
              router.push(`/invoices/${invoiceId}`);
            },
            // transação exige rede (ADR-018)
            onError: () => toast.error(dict.errors.offline),
          },
        );
      }}
    >
      <Receipt className="mr-1 size-4" aria-hidden="true" />
      {dict.jobs.convertToInvoice}
    </Button>
  );
}
