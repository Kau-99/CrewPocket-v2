import { describe, expect, it } from "vitest";

import { makeSubscription } from "@/test/factories";

import { subscriptionSchema } from "../schemas";

describe("subscriptionSchema", () => {
  it("accepts a valid subscription", () => {
    expect(subscriptionSchema.safeParse(makeSubscription()).success).toBe(true);
  });

  it.each([
    ["status inválido", { status: "expired" }],
    ["plan inválido", { plan: "enterprise" }],
    ["interval inválido", { interval: "weekly" }],
    ["currentPeriodEnd não-Timestamp", { currentPeriodEnd: Date.now() }],
    ["cancelAtPeriodEnd não-bool", { cancelAtPeriodEnd: "no" }],
  ])("rejects %s", (_label, override) => {
    expect(subscriptionSchema.safeParse({ ...makeSubscription(), ...override }).success).toBe(
      false,
    );
  });
});
