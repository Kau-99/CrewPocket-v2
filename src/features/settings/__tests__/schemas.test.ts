import { describe, expect, it } from "vitest";

import { buildDefaultSettings, settingsSchema } from "../schemas";

describe("settingsSchema", () => {
  it("applies SPEC §4.7 defaults", () => {
    const settings = buildDefaultSettings("Acme Insulation");

    expect(settings).toMatchObject({
      companyName: "Acme Insulation",
      language: "en",
      theme: "dark",
      timezone: "America/Chicago",
      invoicePrefix: "INV-",
      invoiceCounter: 1,
      estimateCounter: 1,
      defaultLaborRateCents: 65_00,
      mileageRateCents: 67,
      minMarginPct: 20,
      taxPctDefault: 0,
      logoUrl: null,
    });
  });

  it.each([
    ["language inválido", { language: "pt" }],
    ["theme inválido", { theme: "blue" }],
    ["invoiceCounter zero", { invoiceCounter: 0 }],
    ["invoiceCounter não-inteiro", { invoiceCounter: 1.5 }],
    ["estimateCounter zero", { estimateCounter: 0 }],
    ["minMarginPct acima de 100", { minMarginPct: 101 }],
    ["minMarginPct negativo", { minMarginPct: -1 }],
    ["taxPctDefault acima de 30", { taxPctDefault: 31 }],
    ["companyName acima de 120", { companyName: "x".repeat(121) }],
    ["invoicePrefix acima de 10", { invoicePrefix: "x".repeat(11) }],
    ["companyEmail inválido", { companyEmail: "not-an-email" }],
    ["logoUrl inválida", { logoUrl: "not-a-url" }],
  ])("rejects %s", (_label, override) => {
    const base = buildDefaultSettings("Acme");
    const result = settingsSchema.safeParse({ ...base, ...override });
    expect(result.success).toBe(false);
  });

  it("accepts empty companyEmail (or-literal vazio)", () => {
    const base = buildDefaultSettings("Acme");
    expect(settingsSchema.safeParse({ ...base, companyEmail: "" }).success).toBe(true);
  });
});
