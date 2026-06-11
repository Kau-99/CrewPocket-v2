import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { clampClockOut, formatElapsed, formatHours, MAX_SHIFT_MS, timeLogHours } from "../utils";

function ts(iso: string) {
  return Timestamp.fromDate(new Date(iso));
}

describe("timeLogHours", () => {
  it("desconta o break e zera timer aberto", () => {
    expect(
      timeLogHours({
        clockIn: ts("2026-02-01T13:00:00Z"),
        clockOut: ts("2026-02-01T17:30:00Z"),
        breakMinutes: 30,
      }),
    ).toBe(4);
    expect(
      timeLogHours({ clockIn: ts("2026-02-01T13:00:00Z"), clockOut: null, breakMinutes: 0 }),
    ).toBe(0);
  });
});

describe("clampClockOut", () => {
  const clockIn = ts("2026-02-01T08:00:00Z");

  it("usa o agora quando dentro da janela", () => {
    const now = clockIn.toMillis() + 4 * 3_600_000;
    expect(clampClockOut(clockIn, now)).toBe(now);
  });

  it("garante clockOut > clockIn (mínimo +1s)", () => {
    expect(clampClockOut(clockIn, clockIn.toMillis() - 5_000)).toBe(clockIn.toMillis() + 1_000);
  });

  it("teto de 24h para timer esquecido (SPEC §4.5)", () => {
    const tooLate = clockIn.toMillis() + 30 * 3_600_000;
    expect(clampClockOut(clockIn, tooLate)).toBe(clockIn.toMillis() + MAX_SHIFT_MS);
  });
});

describe("formatElapsed / formatHours", () => {
  it("formata o timer ao vivo", () => {
    expect(formatElapsed(0)).toBe("0:00:00");
    expect(formatElapsed(61_000)).toBe("0:01:01");
    expect(formatElapsed(3_600_000 + 90_000)).toBe("1:01:30");
    expect(formatElapsed(-500)).toBe("0:00:00");
  });

  it("formata horas decimais", () => {
    expect(formatHours(4.5)).toBe("4h 30m");
    expect(formatHours(0)).toBe("0h 0m");
    expect(formatHours(7.999)).toBe("8h 0m");
  });
});
