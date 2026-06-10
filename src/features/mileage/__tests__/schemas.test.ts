import { describe, expect, it } from "vitest";

import { makeMileageLog } from "@/test/factories";

import { mileageLogSchema } from "../schemas";

describe("mileageLogSchema", () => {
  it("accepts a valid mileage log (jobId null permitido)", () => {
    expect(mileageLogSchema.safeParse(makeMileageLog()).success).toBe(true);
  });

  it.each([
    ["miles negativo", { miles: -1 }],
    ["miles > 1000", { miles: 1001 }],
    ["purpose > 200", { purpose: "x".repeat(201) }],
    ["date não-Timestamp", { date: "2026-02-01" }],
    ["jobId não-uuid", { jobId: "abc" }],
  ])("rejects %s", (_label, override) => {
    expect(mileageLogSchema.safeParse({ ...makeMileageLog(), ...override }).success).toBe(false);
  });
});
