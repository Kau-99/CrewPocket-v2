import { NextResponse } from "next/server";

import { env } from "@/env";
import { verifyBearer, getAdminDb } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe/client";

export const runtime = "nodejs";

/** Customer Portal: cancelar / trocar cartão / upgrade (SPEC §6.1 item 5). */
export async function POST(request: Request) {
  const user = await verifyBearer(request);
  if (!user) return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });

  if (isRateLimited(`portal:${user.uid}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  try {
    const snapshot = await getAdminDb().collection("customers").doc(user.uid).get();
    const customerId = snapshot.get("stripeCustomerId") as string | undefined;
    if (!customerId) return NextResponse.json({ error: "validation" }, { status: 400 });

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("stripe portal failed", {
      uid: user.uid,
      route: "/api/stripe/portal",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "stripe/portal-failed" }, { status: 500 });
  }
}
