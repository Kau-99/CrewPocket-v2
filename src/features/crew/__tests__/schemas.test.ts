import { describe, expect, it } from "vitest";

import { makeCrewMember } from "@/test/factories";

import { crewMemberSchema } from "../schemas";

describe("crewMemberSchema", () => {
  it("accepts a valid crew member (e email vazio)", () => {
    expect(crewMemberSchema.safeParse(makeCrewMember()).success).toBe(true);
    expect(crewMemberSchema.safeParse({ ...makeCrewMember(), email: "" }).success).toBe(true);
  });

  it.each([
    ["name vazio", { name: "" }],
    ["role > 80", { role: "x".repeat(81) }],
    ["email inválido", { email: "nope" }],
    ["hourlyRateCents float", { hourlyRateCents: 25.5 }],
    ["hourlyRateCents > $1000/h", { hourlyRateCents: 1_000_01 }],
    ["hourlyRateCents negativo", { hourlyRateCents: -1 }],
    ["certifications > 500", { certifications: "x".repeat(501) }],
    ["status inválido", { status: "fired" }],
  ])("rejects %s", (_label, override) => {
    expect(crewMemberSchema.safeParse({ ...makeCrewMember(), ...override }).success).toBe(false);
  });
});
