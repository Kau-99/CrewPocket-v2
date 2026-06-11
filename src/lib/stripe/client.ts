import "server-only";

import Stripe from "stripe";

import { env } from "@/env";

let instance: Stripe | null = null;

/** Stripe APENAS no servidor (SPEC §2/§6.1). Lazy: não derruba build/CI. */
export function getStripe(): Stripe {
  instance ??= new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return instance;
}
