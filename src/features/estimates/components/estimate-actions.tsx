"use client";

import { Briefcase, Check, Download, Eye, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DocumentPdf, type CompanyInfo } from "@/components/shared/document-pdf";
import { useTranslation } from "@/hooks/use-translation";
import { downloadPdf, fillTemplate, openMailto, openPdfPreview } from "@/lib/pdf-actions";
import { formatCents } from "@/lib/utils";

import { useEstimateMutations } from "../hooks/use-estimates";
import type { Estimate } from "../schemas";
import { computeEstimateTotals } from "../utils";

interface EstimateActionsProps {
  estimate: Estimate;
  company: CompanyInfo;
  clientEmail: string | null;
}

export function EstimateActions({ estimate, company, clientEmail }: EstimateActionsProps) {
  const dict = useTranslation();
  const router = useRouter();
  const { send, accept, decline, convert, remove, undoRemove } = useEstimateMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const totals = computeEstimateTotals(estimate);

  function pdfElement() {
    return (
      <DocumentPdf
        heading={dict.estimates.pdfHeading}
        number={estimate.number}
        company={company}
        clientLabel={dict.documents.client}
        clientName={estimate.clientName}
        dateLabel={dict.estimates.fields.validUntil}
        dateValue={estimate.validUntil.toDate().toLocaleDateString()}
        columns={{
          description: dict.documents.descriptionCol,
          qty: dict.documents.qtyCol,
          price: dict.documents.priceCol,
          total: dict.documents.lineTotalCol,
        }}
        lines={estimate.lineItems}
        totals={totals}
        totalsLabels={{
          subtotal: dict.documents.subtotal,
          discount: dict.documents.discount,
          tax: dict.documents.tax,
          total: dict.documents.total,
        }}
        notesLabel={dict.documents.notes}
        notes={estimate.notes}
      />
    );
  }

  function handleSend() {
    send.mutate(estimate, {
      onSuccess: () => {
        toast.success(dict.estimates.sentToast);
        const subject = fillTemplate(dict.estimates.emailSubject, {
          number: estimate.number,
          company: company.name,
        });
        const body = fillTemplate(dict.estimates.emailBody, {
          client: estimate.clientName || "",
          number: estimate.number,
          total: formatCents(totals.totalCents),
          company: company.name,
        });
        openMailto(clientEmail ?? "", subject, body);
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  function handleConvert() {
    convert.mutate(estimate, {
      onSuccess: (jobId) => {
        toast.success(dict.estimates.convertedToast);
        router.push(`/jobs/${jobId}`);
      },
      onError: () => toast.error(dict.errors.offline),
    });
  }

  function handleDelete() {
    remove.mutate(estimate, {
      onSuccess: () => {
        router.push("/estimates");
        toast(dict.estimates.deletedToast, {
          duration: 5000,
          action: {
            label: dict.common.undo,
            onClick: () => {
              undoRemove.mutate(estimate);
            },
          },
        });
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  const pending = send.isPending || accept.isPending || decline.isPending || convert.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={handleSend}>
        <Send className="mr-1 size-4" aria-hidden="true" />
        {dict.documents.send}
      </Button>
      {estimate.status === "sent" && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              accept.mutate(estimate, {
                onSuccess: () => toast.success(dict.estimates.acceptedToast),
                onError: () => toast.error(dict.errors.unknown),
              });
            }}
          >
            <Check className="mr-1 size-4" aria-hidden="true" />
            {dict.estimates.actions.markAccepted}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              decline.mutate(estimate, {
                onSuccess: () => toast.success(dict.estimates.declinedToast),
                onError: () => toast.error(dict.errors.unknown),
              });
            }}
          >
            <X className="mr-1 size-4" aria-hidden="true" />
            {dict.estimates.actions.markDeclined}
          </Button>
        </>
      )}
      {estimate.convertedJobId ? (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/jobs/${estimate.convertedJobId}`}>
            <Briefcase className="mr-1 size-4" aria-hidden="true" />
            {dict.estimates.actions.viewJob}
          </Link>
        </Button>
      ) : (
        <Button size="sm" disabled={pending} onClick={handleConvert}>
          <Briefcase className="mr-1 size-4" aria-hidden="true" />
          {dict.estimates.actions.convertToJob}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => void openPdfPreview(pdfElement())}>
        <Eye className="mr-1 size-4" aria-hidden="true" />
        {dict.documents.previewPdf}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void downloadPdf(pdfElement(), `${estimate.number}.pdf`)}
      >
        <Download className="mr-1 size-4" aria-hidden="true" />
        {dict.documents.downloadPdf}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        onClick={() => {
          setDeleteOpen(true);
        }}
      >
        <Trash2 className="mr-1 size-4" aria-hidden="true" />
        {dict.common.delete}
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.estimates.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dict.estimates.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{dict.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
