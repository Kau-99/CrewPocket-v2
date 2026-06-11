import { computeDocumentTotals, type DocumentTotals } from "@/lib/totals";

import type { Estimate, EstimateStatus } from "./schemas";

/** Totais NUNCA são armazenados — sempre derivados (SPEC §4.3). */
export function computeEstimateTotals(
  estimate: Pick<Estimate, "lineItems" | "discountPct" | "taxPct">,
): DocumentTotals {
  return computeDocumentTotals(estimate.lineItems, estimate.discountPct, estimate.taxPct);
}

/** SPEC §5: sent com validUntil < now → expired (na leitura, não cron). */
export function effectiveEstimateStatus(
  estimate: Pick<Estimate, "status" | "validUntil">,
  nowMs: number,
): EstimateStatus {
  if (estimate.status === "sent" && estimate.validUntil.toMillis() < nowMs) return "expired";
  return estimate.status;
}
