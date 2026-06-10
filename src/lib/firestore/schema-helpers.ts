import { Timestamp } from "firebase/firestore";
import { z } from "zod";

/** SPEC §3.2.6: datas armazenadas como Firestore Timestamp. */
export const timestampSchema = z.custom<Timestamp>(
  (value) => value instanceof Timestamp,
  "Expected Firestore Timestamp",
);

/** SPEC §4: campos comuns que todas as entidades estendem. */
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  schemaVersion: z.literal(2),
});

export type BaseEntity = z.infer<typeof baseEntitySchema>;

/** Borda do app: Timestamp → Date (exibição via Intl/date-fns). */
export function toDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

/** Campos base de uma entidade nova (id v4, ownerId, timestamps de agora). */
export function newEntityBase(ownerId: string): BaseEntity {
  const now = Timestamp.now();
  return {
    id: crypto.randomUUID(),
    ownerId,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2,
  };
}
