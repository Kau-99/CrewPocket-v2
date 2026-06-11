"use client";

import { Ban, Briefcase, Check, Download, Eye, Send, Trash2 } from "lucide-react";
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

import { useInvoiceMutations } from "../hooks/use-invoices";
import type { Invoice } from "../schemas";
import { computeInvoiceTotals } from "../utils";

interface InvoiceActionsProps {
  invoice: Invoice;
  company: CompanyInfo;
  clientEmail: string | null;
}

export function InvoiceActions({ invoice, company, clientEmail }: InvoiceActionsProps) {
  const dict = useTranslation();
  const router = useRouter();
  const { send, markPaid, voidIt, remove, undoRemove } = useInvoiceMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const totals = computeInvoiceTotals(invoice);

  function pdfElement() {
    return (
      <DocumentPdf
        heading={dict.invoices.pdfHeading}
        number={invoice.number}
        company={company}
        clientLabel={dict.documents.client}
        clientName={invoice.clientName}
        dateLabel={dict.invoices.fields.dueDate}
        dateValue={invoice.dueDate.toDate().toLocaleDateString()}
        columns={{
          description: dict.documents.descriptionCol,
          qty: dict.documents.qtyCol,
          price: dict.documents.priceCol,
          total: dict.documents.lineTotalCol,
        }}
        lines={invoice.lineItems}
        totals={totals}
        totalsLabels={{
          subtotal: dict.documents.subtotal,
          discount: dict.documents.discount,
          tax: dict.documents.tax,
          total: dict.documents.total,
        }}
        notesLabel={dict.documents.notes}
        notes={invoice.notes}
      />
    );
  }

  function handleSend() {
    send.mutate(invoice, {
      onSuccess: () => {
        toast.success(dict.invoices.sentToast);
        openMailto(
          clientEmail ?? "",
          fillTemplate(dict.invoices.emailSubject, {
            number: invoice.number,
            company: company.name,
          }),
          fillTemplate(dict.invoices.emailBody, {
            client: invoice.clientName || "",
            number: invoice.number,
            total: formatCents(totals.totalCents),
            due: invoice.dueDate.toDate().toLocaleDateString(),
            company: company.name,
          }),
        );
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  function handleDelete() {
    remove.mutate(invoice, {
      onSuccess: () => {
        router.push("/invoices");
        toast(dict.invoices.deletedToast, {
          duration: 5000,
          action: {
            label: dict.common.undo,
            onClick: () => {
              undoRemove.mutate(invoice);
            },
          },
        });
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  const pending = send.isPending || markPaid.isPending || voidIt.isPending;
  const open = invoice.status !== "paid" && invoice.status !== "void";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {open && (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={handleSend}>
            <Send className="mr-1 size-4" aria-hidden="true" />
            {dict.documents.send}
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              markPaid.mutate(invoice, {
                onSuccess: () => toast.success(dict.invoices.paidToast),
                onError: () => toast.error(dict.errors.unknown),
              });
            }}
          >
            <Check className="mr-1 size-4" aria-hidden="true" />
            {dict.invoices.actions.markPaid}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              voidIt.mutate(invoice, {
                onSuccess: () => toast.success(dict.invoices.voidToast),
                onError: () => toast.error(dict.errors.unknown),
              });
            }}
          >
            <Ban className="mr-1 size-4" aria-hidden="true" />
            {dict.invoices.actions.voidInvoice}
          </Button>
        </>
      )}
      <Button size="sm" variant="outline" asChild>
        <Link href={`/jobs/${invoice.jobId}`}>
          <Briefcase className="mr-1 size-4" aria-hidden="true" />
          {dict.invoices.actions.viewJob}
        </Link>
      </Button>
      <Button size="sm" variant="outline" onClick={() => void openPdfPreview(pdfElement())}>
        <Eye className="mr-1 size-4" aria-hidden="true" />
        {dict.documents.previewPdf}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void downloadPdf(pdfElement(), `${invoice.number}.pdf`)}
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
            <AlertDialogTitle>{dict.invoices.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dict.invoices.deleteDescription}</AlertDialogDescription>
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
