import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { makeInvoice, makeLineItem } from "@/test/factories";

import { computeInvoiceTotals, effectiveInvoiceStatus } from "../utils";

describe("computeInvoiceTotals", () => {
  it("deriva totais dos line items", () => {
    const invoice = {
      ...makeInvoice(),
      lineItems: [{ ...makeLineItem(), qty: 1, unitPriceCents: 200_00 }],
      discountPct: 0,
      taxPct: 10,
    };
    expect(computeInvoiceTotals(invoice).totalCents).toBe(220_00);
  });
});

describe("effectiveInvoiceStatus (SPEC §5: overdue na leitura)", () => {
  const past = Timestamp.fromMillis(Date.now() - 86_400_000);
  const future = Timestamp.fromMillis(Date.now() + 86_400_000);

  it("sent vencida → overdue", () => {
    expect(effectiveInvoiceStatus({ status: "sent", dueDate: past }, Date.now())).toBe("overdue");
  });

  it("sent dentro do prazo continua sent", () => {
    expect(effectiveInvoiceStatus({ status: "sent", dueDate: future }, Date.now())).toBe("sent");
  });

  it("paid/void/draft não viram overdue", () => {
    expect(effectiveInvoiceStatus({ status: "paid", dueDate: past }, Date.now())).toBe("paid");
    expect(effectiveInvoiceStatus({ status: "void", dueDate: past }, Date.now())).toBe("void");
    expect(effectiveInvoiceStatus({ status: "draft", dueDate: past }, Date.now())).toBe("draft");
  });
});
