import { z } from "zod";

import { baseEntitySchema, timestampSchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.3 */
export const estimateStatusSchema = z.enum(["draft", "sent", "accepted", "declined", "expired"]);

export const lineItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300),
  qty: z.number().min(0).max(1_000_000),
  unitPriceCents: z.number().int().min(0),
});

export const estimateSchema = baseEntitySchema.extend({
  number: z.string().max(20),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().max(120),
  title: z.string().min(1).max(200),
  status: estimateStatusSchema,
  lineItems: z.array(lineItemSchema).min(1).max(100),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(30).default(0),
  notes: z.string().max(5000),
  validUntil: timestampSchema,
  sentAt: timestampSchema.nullable(),
  acceptedAt: timestampSchema.nullable(),
  declinedAt: timestampSchema.nullable(),
  convertedJobId: z.string().uuid().nullable(),
});

export type Estimate = z.infer<typeof estimateSchema>;
export type EstimateStatus = z.infer<typeof estimateStatusSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
