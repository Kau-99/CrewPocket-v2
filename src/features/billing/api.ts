import { AppError } from "@/lib/errors";
import { auth } from "@/lib/firebase/client";

import type { Plan, Interval } from "./types";

/** POST autenticado com o Firebase ID token (SPEC §6.1 item 1). */
async function authorizedPost(path: string, body: unknown): Promise<{ url: string }> {
  const user = auth.currentUser;
  if (!user) throw new AppError("auth/expired");

  const token = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new AppError(
      path.includes("portal") ? "stripe/portal-failed" : "stripe/checkout-failed",
      `HTTP ${response.status}`,
    );
  }
  return (await response.json()) as { url: string };
}

export async function startCheckout(plan: Plan, interval: Interval): Promise<void> {
  const { url } = await authorizedPost("/api/stripe/checkout", { plan, interval });
  window.location.assign(url);
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await authorizedPost("/api/stripe/portal", {});
  window.location.assign(url);
}
