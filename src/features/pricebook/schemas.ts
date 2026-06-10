import { z } from "zod";

import { baseEntitySchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.5 */
export const pricebookItemSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  category: z.string().max(60),
  unit: z.string().max(20),
  unitPriceCents: z.number().int().min(0),
  unitCostCents: z.number().int().min(0),
  description: z.string().max(500),
});

export type PricebookItem = z.infer<typeof pricebookItemSchema>;
