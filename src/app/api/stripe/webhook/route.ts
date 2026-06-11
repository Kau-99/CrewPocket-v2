import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "@/env";
import { getAdminDb } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe/client";
import { processStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // RAW body obrigatório para validar a assinatura (SPEC §6.1) — nunca JSON parseado
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse(null, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    // assinatura inválida → 400 SEM logar o payload (SPEC §9)
    return new NextResponse(null, { status: 400 });
  }

  try {
    await processStripeEvent(event, {
      db: getAdminDb(),
      getSubscription: (id) => getStripe().subscriptions.retrieve(id),
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    // erro de processamento → 500 (Stripe re-tenta) — SPEC §9
    logger.error("stripe webhook processing failed", {
      route: "/api/stripe/webhook",
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 500 });
  }
}
