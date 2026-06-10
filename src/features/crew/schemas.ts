import { z } from "zod";

import { baseEntitySchema } from "@/lib/firestore/schema-helpers";

/** SPEC §4.5 */
export const crewMemberSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  role: z.string().max(80),
  phone: z.string().max(30),
  email: z.string().email().or(z.literal("")),
  hourlyRateCents: z.number().int().min(0).max(1_000_00),
  certifications: z.string().max(500),
  status: z.enum(["active", "inactive"]),
});

export type CrewMember = z.infer<typeof crewMemberSchema>;
