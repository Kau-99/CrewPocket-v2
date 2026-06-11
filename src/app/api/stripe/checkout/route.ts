import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/env";
import { verifyBearer, getAdminDb } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe/client";
import { priceIdFor } from "@/lib/stripe/plans";

export const runtime = "nodejs";

const bodySchema = z.object({
  plan: z.enum(["solo", "pro"]),
  interval: z.enum(["monthly", "annual"]),
});

/** Busca/cria o customer — `customers/{uid}` é server-only (SPEC §6.1/§6.3). */
async function getOrCreateCustomerId(uid: string, email: string | undefined): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("customers").doc(uid);
  const snapshot = await ref.get();
  const existing = snapshot.get("stripeCustomerId") as string | undefined;
  if (existing) return existing;

  const customer = await getStripe().customers.create({
    ...(email ? { email } : {}),
    metadata: { uid },
  });
  await ref.set({ stripeCustomerId: customer.id });
  return customer.id;
}

export async function POST(request: Request) {
  const user = await verifyBearer(request);
  if (!user) return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });

  if (isRateLimited(`checkout:${user.uid}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  try {
    const customerId = await getOrCreateCustomerId(user.uid, user.email);
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.uid,
      line_items: [{ price: priceIdFor(parsed.data.plan, parsed.data.interval), quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { uid: user.uid },
      },
      success_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=canceled`,
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("stripe checkout failed", {
      uid: user.uid,
      route: "/api/stripe/checkout",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "stripe/checkout-failed" }, { status: 500 });
  }
}
