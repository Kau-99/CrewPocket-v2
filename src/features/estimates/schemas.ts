import { z } from "zod";

import { baseEntitySchema, timestampSchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.3 */
export const estimateStatusSchema = z.enum(["draft", "sent", "accepted", "declined", "expired"]);

export const lineItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300),
  qty: z.number().min(0).max(1_000_000),
  unitPriceCents: z.number().int().min(0),
  unit: z.string().max(20).default(""),
  note: z.string().max(300).default(""),
});

/** Depósito exigido: nenhum, valor fixo (centavos) ou percentual do total. */
export const depositTypeSchema = z.enum(["none", "fixed", "percent"]);

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
  // ── termos + depósito ──
  terms: z.string().max(5000).default(""),
  depositType: depositTypeSchema.default("none"),
  depositValue: z.number().min(0).max(10_000_000_00).default(0),
  // ── assinatura do cliente (data URL gravado no doc; sem Storage ainda) ──
  signatureDataUrl: z.string().max(400_000).default(""),
  signedName: z.string().max(120).default(""),
  signedAt: timestampSchema.nullable().default(null),
});

export type Estimate = z.infer<typeof estimateSchema>;
export type EstimateStatus = z.infer<typeof estimateStatusSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
export type DepositType = z.infer<typeof depositTypeSchema>;

/** Template reutilizável de estimate (SPEC §8 — serviços repetidos). */
export const estimateTemplateSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  title: z.string().max(200).default(""),
  lineItems: z.array(lineItemSchema).max(100),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(30).default(0),
  notes: z.string().max(5000).default(""),
  terms: z.string().max(5000).default(""),
});

export type EstimateTemplate = z.infer<typeof estimateTemplateSchema>;

/** Depósito devido em centavos a partir do total derivado. */
export function depositDueCents(
  depositType: DepositType,
  depositValue: number,
  totalCents: number,
): number {
  if (depositType === "fixed") return Math.min(depositValue, totalCents);
  if (depositType === "percent") return Math.round((totalCents * depositValue) / 100);
  return 0;
}
