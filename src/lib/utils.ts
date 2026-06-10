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

/** Exhaustiveness check para switches sobre unions (ex.: máquina de estados do Job). */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
