import { z } from "zod";

import { baseEntitySchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.1 */
export const clientSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  email: z.string().email().max(120).or(z.literal("")),
  phone: z.string().max(30),
  address: z.string().max(300),
  city: z.string().max(100),
  state: z.string().max(2),
  zip: z.string().max(10),
  notes: z.string().max(2000),
  isArchived: z.boolean().default(false),
});

export type Client = z.infer<typeof clientSchema>;

/** Campos editáveis pelo form (o resto vem de newEntityBase/servidor). */
export const clientFormSchema = clientSchema.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
  isArchived: true,
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
