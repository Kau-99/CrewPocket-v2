import { z } from "zod";

import { baseEntitySchema, timestampSchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.2 */
export const jobStatusSchema = z.enum([
  "lead",
  "quoted",
  "draft",
  "active",
  "completed",
  "invoiced",
]);
export const paymentStatusSchema = z.enum(["unpaid", "partial", "paid"]);
export const prioritySchema = z.enum(["low", "normal", "high"]);

export const costCategorySchema = z.enum([
  "material",
  "labor",
  "equipment",
  "subcontractor",
  "other",
]);

export const costItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: costCategorySchema,
  qty: z.number().min(0).max(1_000_000),
  unitCostCents: z.number().int().min(0).max(1_000_000_00),
});

/** Item do checklist interno do job (SPEC §8 — campos ricos). */
export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(200),
  done: z.boolean(),
});

export const jobSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(200),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().max(120),
  status: jobStatusSchema,
  priority: prioritySchema.default("normal"),
  paymentStatus: paymentStatusSchema.default("unpaid"),
  date: timestampSchema,
  deadline: timestampSchema.nullable(),
  address: z.string().max(300),
  zip: z.string().max(10),
  description: z.string().max(2000),
  notes: z.string().max(2000),
  tags: z.array(z.string().max(30)).max(20),
  costs: z.array(costItemSchema).max(100),
  valueCents: z.number().int().min(0).max(10_000_000_00),
  depositCents: z.number().int().min(0).default(0),
  paidCents: z.number().int().min(0).default(0),
  paidAt: timestampSchema.nullable(),
  photoUrls: z.array(z.string().url()).max(30),
  estimateId: z.string().uuid().nullable(),
  invoiceId: z.string().uuid().nullable(),
  // ── campos ricos (todos opcionais/default p/ compat com docs já gravados) ──
  serviceType: z.string().max(80).default(""),
  city: z.string().max(120).default(""),
  state: z.string().max(40).default(""),
  areaSqft: z.number().min(0).max(100_000_000).default(0),
  scheduledTime: z.string().max(60).default(""),
  siteContactName: z.string().max(120).default(""),
  siteContactPhone: z.string().max(40).default(""),
  referralSource: z.string().max(120).default(""),
  crewIds: z.array(z.string().uuid()).max(20).default([]),
  checklist: z.array(checklistItemSchema).max(50).default([]),
});

export type Job = z.infer<typeof jobSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type CostItem = z.infer<typeof costItemSchema>;
export type CostCategory = z.infer<typeof costCategorySchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

/** Campos editáveis pelo form de job (datas como Date na borda da UI). */
export const jobFormSchema = z.object({
  name: z.string().min(1).max(200),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().max(120),
  priority: prioritySchema,
  date: z.date(),
  deadline: z.date().nullable(),
  address: z.string().max(300),
  zip: z.string().max(10),
  description: z.string().max(2000),
  notes: z.string().max(2000),
  tags: z.array(z.string().max(30)).max(20),
  valueCents: z.number().int().min(0).max(10_000_000_00),
  depositCents: z.number().int().min(0),
  serviceType: z.string().max(80),
  city: z.string().max(120),
  state: z.string().max(40),
  areaSqft: z.number().min(0).max(100_000_000),
  scheduledTime: z.string().max(60),
  siteContactName: z.string().max(120),
  siteContactPhone: z.string().max(40),
  referralSource: z.string().max(120),
  crewIds: z.array(z.string().uuid()).max(20),
  checklist: z.array(checklistItemSchema).max(50),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;
