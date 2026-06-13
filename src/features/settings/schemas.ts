import { z } from "zod";

/** SPEC §4.7 — doc único `settings/{uid}`. */
export const settingsSchema = z.object({
  companyName: z.string().max(120),
  companyAddress: z.string().max(300),
  companyPhone: z.string().max(30),
  companyEmail: z.string().email().or(z.literal("")),
  logoUrl: z.string().url().nullable(),
  language: z.enum(["en", "es"]).default("en"),
  theme: z.enum(["dark", "light", "system"]).default("dark"),
  timezone: z.string().default("America/Chicago"),
  invoicePrefix: z.string().max(10).default("INV-"),
  invoiceCounter: z.number().int().min(1).default(1),
  estimateCounter: z.number().int().min(1).default(1),
  defaultLaborRateCents: z.number().int().default(65_00),
  mileageRateCents: z.number().int().default(67),
  minMarginPct: z.number().min(0).max(100).default(20),
  taxPctDefault: z.number().min(0).max(30).default(0),
  // ── dados de negócio (aparecem nos documentos) ──
  taxId: z.string().max(40).default(""),
  licenseNumber: z.string().max(60).default(""),
  website: z.string().max(120).default(""),
  // ── padrões de documento ──
  defaultEstimateTerms: z.string().max(5000).default(""),
  paymentInstructions: z.string().max(2000).default(""),
});

export type Settings = z.infer<typeof settingsSchema>;

/** Doc criado no primeiro login (onboarding pede só o nome da empresa). */
export function buildDefaultSettings(companyName: string): Settings {
  return settingsSchema.parse({
    companyName,
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    logoUrl: null,
  });
}
