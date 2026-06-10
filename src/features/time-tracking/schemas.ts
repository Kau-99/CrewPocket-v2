import { z } from "zod";

import { baseEntitySchema, timestampSchema } from "@/lib/firestore/schema-helpers";

/**
 * SPEC §4.5 — TimeLog.
 * Regras de negócio (hours ≤ 24, clockOut > clockIn, 1 timer aberto por
 * membro) são aplicadas em utils/transações na Fase 3 e nas Firestore Rules.
 */
export const timeLogSchema = baseEntitySchema.extend({
  jobId: z.string().uuid(),
  crewMemberId: z.string().uuid().nullable(),
  crewName: z.string().max(120),
  clockIn: timestampSchema,
  clockOut: timestampSchema.nullable(),
  breakMinutes: z.number().int().min(0).max(480).default(0),
  note: z.string().max(500),
  gps: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number(),
    })
    .nullable(),
});

export type TimeLog = z.infer<typeof timeLogSchema>;
