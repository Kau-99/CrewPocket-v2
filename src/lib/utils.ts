import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Dinheiro é SEMPRE inteiro em centavos (SPEC §3.2.7).
 * Esta é a única fronteira onde centavos viram string para exibição.
 */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`formatCents requires an integer cent amount, got ${cents}`);
  }
  return usdFormatter.format(cents / 100);
}

/**
 * Borda de input: "1,234.56" → 123456 centavos (inteiro) ou null se inválido.
 * Único ponto onde dólares digitados viram centavos.
 */
export function dollarsToCents(input: string): number | null {
  const normalized = input.replace(/[$,\s]/g, "");
  if (normalized === "") return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Centavos → string editável ("1234.56"), sem símbolo. */
export function centsToDollarsString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Exhaustiveness check para switches sobre unions (ex.: máquina de estados do Job). */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
