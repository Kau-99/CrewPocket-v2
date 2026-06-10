import { z } from "zod";

import { baseEntitySchema, timestampSchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.4 — lineItemSchema duplicado de estimates de propósito:
 * features são ilhas (SPEC §3.2.1), e o formato é contrato de dados, não código. */
export const invoiceLineItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300),
  qty: z.number().min(0).max(1_000_000),
  unitPriceCents: z.number().int().min(0),
});

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "overdue", "void"]);

export const invoiceSchema = baseEntitySchema.extend({
  number: z.string().max(20),
  jobId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().max(120),
  lineItems: z.array(invoiceLineItemSchema).min(1),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(30).default(0),
  notes: z.string().max(5000),
  status: invoiceStatusSchema,
  dueDate: timestampSchema,
  paidAt: timestampSchema.nullable(),
  paidCents: z.number().int().min(0).default(0),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
