import { computeDocumentTotals, type DocumentTotals } from "@/lib/totals";

import type { Invoice, InvoiceStatus } from "./schemas";

/** Totais sempre derivados (mesma regra dos estimates, SPEC §4.3/§4.4). */
export function computeInvoiceTotals(
  invoice: Pick<Invoice, "lineItems" | "discountPct" | "taxPct">,
): DocumentTotals {
  return computeDocumentTotals(invoice.lineItems, invoice.discountPct, invoice.taxPct);
}

/** SPEC §5: sent com dueDate < now → overdue (na leitura, não cron). */
export function effectiveInvoiceStatus(
  invoice: Pick<Invoice, "status" | "dueDate">,
  nowMs: number,
): InvoiceStatus {
  if (invoice.status === "sent" && invoice.dueDate.toMillis() < nowMs) return "overdue";
  return invoice.status;
}
