import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { makeEstimate, makeLineItem } from "@/test/factories";

import { computeEstimateTotals, effectiveEstimateStatus } from "../utils";

describe("computeEstimateTotals", () => {
  it("deriva totais dos line items (nunca armazenados)", () => {
    const estimate = {
      ...makeEstimate(),
      lineItems: [{ ...makeLineItem(), qty: 2, unitPriceCents: 50_00 }],
      discountPct: 10,
      taxPct: 0,
    };
    const totals = computeEstimateTotals(estimate);
    expect(totals.subtotalCents).toBe(100_00);
    expect(totals.totalCents).toBe(90_00);
  });
});

describe("effectiveEstimateStatus (SPEC §5: expira na leitura)", () => {
  const past = Timestamp.fromMillis(Date.now() - 86_400_000);
  const future = Timestamp.fromMillis(Date.now() + 86_400_000);

  it("sent vencido → expired", () => {
    expect(effectiveEstimateStatus({ status: "sent", validUntil: past }, Date.now())).toBe(
      "expired",
    );
  });

  it("sent dentro da validade continua sent", () => {
    expect(effectiveEstimateStatus({ status: "sent", validUntil: future }, Date.now())).toBe(
      "sent",
    );
  });

  it("draft/accepted/declined não expiram", () => {
    expect(effectiveEstimateStatus({ status: "draft", validUntil: past }, Date.now())).toBe(
      "draft",
    );
    expect(effectiveEstimateStatus({ status: "accepted", validUntil: past }, Date.now())).toBe(
      "accepted",
    );
    expect(effectiveEstimateStatus({ status: "declined", validUntil: past }, Date.now())).toBe(
      "declined",
    );
  });
});
