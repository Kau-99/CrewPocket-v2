import { describe, expect, it } from "vitest";

import { assertNever, cn, formatCents } from "@/lib/utils";

describe("formatCents", () => {
  it("formats integer cents as USD", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(1)).toBe("$0.01");
    expect(formatCents(45_00)).toBe("$45.00");
    expect(formatCents(1_234_567)).toBe("$12,345.67");
  });

  it("rejects non-integer cent amounts (SPEC §3.2.7: proibido float em dinheiro)", () => {
    expect(() => formatCents(10.5)).toThrow(RangeError);
    expect(() => formatCents(0.1 + 0.2)).toThrow(RangeError);
  });

  it("handles negative amounts (ex.: estorno)", () => {
    expect(formatCents(-45_00)).toBe("-$45.00");
  });
});

describe("cn", () => {
  it("merges tailwind classes with later overrides winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", false, undefined, "font-bold")).toBe("text-red-500 font-bold");
  });
});

describe("assertNever", () => {
  it("throws when reached", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(/unexpected/);
  });
});
