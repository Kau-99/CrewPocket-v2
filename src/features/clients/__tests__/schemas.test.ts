import { describe, expect, it } from "vitest";

import { makeClient } from "@/test/factories";

import { clientSchema } from "../schemas";

describe("clientSchema", () => {
  it("accepts a valid client", () => {
    expect(clientSchema.safeParse(makeClient()).success).toBe(true);
  });

  it("accepts empty email (or-literal)", () => {
    expect(clientSchema.safeParse({ ...makeClient(), email: "" }).success).toBe(true);
  });

  it.each([
    ["id não-uuid", { id: "abc" }],
    ["ownerId vazio", { ownerId: "" }],
    ["schemaVersion errada", { schemaVersion: 1 }],
    ["createdAt não-Timestamp", { createdAt: new Date() }],
    ["name vazio", { name: "" }],
    ["name > 120", { name: "x".repeat(121) }],
    ["email inválido", { email: "not-an-email" }],
    ["email > 120", { email: `${"x".repeat(118)}@a.com` }],
    ["phone > 30", { phone: "1".repeat(31) }],
    ["address > 300", { address: "x".repeat(301) }],
    ["state > 2", { state: "TEX" }],
    ["zip > 10", { zip: "1".repeat(11) }],
    ["notes > 2000", { notes: "x".repeat(2001) }],
    ["isArchived não-bool", { isArchived: "yes" }],
  ])("rejects %s", (_label, override) => {
    expect(clientSchema.safeParse({ ...makeClient(), ...override }).success).toBe(false);
  });
});
