import { z } from "zod";

import { timestampSchema } from "@/lib/firestore/schema-helpers";

/**
 * SPEC §4.6 — subscriptions/{uid}: escrita SOMENTE pelo servidor
 * (webhook Stripe via Admin SDK). Client apenas lê o próprio doc.
 */
export const subscriptionSchema = z.object({
  status: z.enum(["active", "trialing", "past_due", "canceled", "none"]),
  plan: z.enum(["solo", "pro"]),
  interval: z.enum(["monthly", "annual"]),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string(),
  currentPeriodEnd: timestampSchema,
  cancelAtPeriodEnd: z.boolean(),
  updatedAt: timestampSchema,
});

export type Subscription = z.infer<typeof subscriptionSchema>;
