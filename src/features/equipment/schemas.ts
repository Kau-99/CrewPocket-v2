import { z } from "zod";

import { baseEntitySchema } from "@/lib/firestore/schema-helpers";

/** Status de um ativo/máquina (≠ material consumível do inventário). */
export const equipmentStatusSchema = z.enum(["available", "in_use", "maintenance", "retired"]);

/** Máquinas e equipamentos do contratante (ativos, 1 unidade cada). */
export const equipmentItemSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  category: z.string().max(60),
  status: equipmentStatusSchema.default("available"),
  serialNumber: z.string().max(80),
  location: z.string().max(120),
  purchaseCostCents: z.number().int().min(0).default(0),
  notes: z.string().max(2000),
});

export type EquipmentItem = z.infer<typeof equipmentItemSchema>;
export type EquipmentStatus = z.infer<typeof equipmentStatusSchema>;
