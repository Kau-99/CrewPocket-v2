import { z } from "zod";

import { baseEntitySchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.5 — quantity ≤ minStock → alerta (notificações, Fase 6). */
export const inventoryItemSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  category: z.string().max(60),
  quantity: z.number().min(0).max(1_000_000),
  unit: z.string().max(20),
  unitCostCents: z.number().int().min(0),
  supplier: z.string().max(120),
  minStock: z.number().min(0).default(0),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
