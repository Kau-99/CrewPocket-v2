import { describe, expect, it } from "vitest";

import { makeTimeLog } from "@/test/factories";

import { timeLogSchema } from "../schemas";

describe("timeLogSchema", () => {
  it("accepts a valid time log (timer fechado e aberto, gps null)", () => {
    expect(timeLogSchema.safeParse(makeTimeLog()).success).toBe(true);
    expect(timeLogSchema.safeParse({ ...makeTimeLog(), clockOut: null }).success).toBe(true);
    expect(timeLogSchema.safeParse({ ...makeTimeLog(), gps: null }).success).toBe(true);
  });

  it("applies breakMinutes default 0", () => {
    const log = makeTimeLog() as Record<string, unknown>;
    delete log.breakMinutes;
    expect(timeLogSchema.parse(log).breakMinutes).toBe(0);
  });

  it.each([
    ["jobId não-uuid", { jobId: "abc" }],
    ["crewMemberId não-uuid", { crewMemberId: "abc" }],
    ["clockIn não-Timestamp", { clockIn: Date.now() }],
    ["breakMinutes negativo", { breakMinutes: -1 }],
    ["breakMinutes > 480", { breakMinutes: 481 }],
    ["breakMinutes float", { breakMinutes: 30.5 }],
    ["note > 500", { note: "x".repeat(501) }],
    ["gps sem accuracy", { gps: { lat: 1, lng: 2 } }],
  ])("rejects %s", (_label, override) => {
    expect(timeLogSchema.safeParse({ ...makeTimeLog(), ...override }).success).toBe(false);
  });
});
