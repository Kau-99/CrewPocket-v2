import { z } from "zod";

import { baseEntitySchema, timestampSchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.5 — dedução = miles × settings.mileageRateCents. */
export const mileageLogSchema = baseEntitySchema.extend({
  jobId: z.string().uuid().nullable(),
  date: timestampSchema,
  miles: z.number().min(0).max(1000),
  purpose: z.string().max(200),
});

export type MileageLog = z.infer<typeof mileageLogSchema>;
