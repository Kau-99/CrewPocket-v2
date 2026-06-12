import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";

import { planFromPriceId } from "@/lib/stripe/plans";

/**
 * Processamento dos eventos do webhook (SPEC §6.1, tabela de 4 eventos).
 * Separado da route para ser testável: o contexto injeta o Firestore Admin
 * (emulator nos testes) e o retrieve de subscription (stub nos testes).
 */
export interface WebhookContext {
  db: FirebaseFirestore.Firestore;
  getSubscription: (id: string) => Promise<Stripe.Subscription>;
}

export type ProcessResult = "processed" | "duplicate" | "ignored";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "none";

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

async function uidByCustomer(
  db: FirebaseFirestore.Firestore,
  customerId: string,
): Promise<string | null> {
  const snapshot = await db
    .collection("customers")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  return snapshot.docs[0]?.id ?? null;
}

function customerIdOf(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

async function resolveUid(
  db: FirebaseFirestore.Firestore,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataUid = subscription.metadata.uid;
  if (metadataUid) return metadataUid;
  return uidByCustomer(db, customerIdOf(subscription));
}

/** Escreve subscriptions/{uid} — ÚNICO escritor é o servidor (SPEC §6.3). */
async function writeSubscription(
  db: FirebaseFirestore.Firestore,
  uid: string,
  subscription: Stripe.Subscription,
  statusOverride?: SubscriptionStatus,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const planInfo = planFromPriceId(priceId) ?? {
    plan: "solo" as const,
    interval: "monthly" as const,
  };

  await db
    .collection("subscriptions")
    .doc(uid)
    .set({
      status: statusOverride ?? mapStatus(subscription.status),
      plan: planInfo.plan,
      interval: planInfo.interval,
      stripeCustomerId: customerIdOf(subscription),
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      updatedAt: Timestamp.now(),
    });
}

export async function processStripeEvent(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<ProcessResult> {
  // Idempotência (SPEC §6.1): processedEvents/{event.id} em transação;
  // duplicado → 200 sem reprocessar.
  const fresh = await ctx.db.runTransaction(async (transaction) => {
    const ref = ctx.db.collection("processedEvents").doc(event.id);
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) return false;
    transaction.set(ref, { type: event.type, receivedAt: Timestamp.now() });
    return true;
  });
  if (!fresh) return "duplicate";

  try {
    return await applyEvent(event, ctx);
  } catch (error) {
    // A marca de idempotência foi reservada mas o processamento falhou: sem
    // liberar, o retry do Stripe viraria "duplicate" e o evento se perderia.
    await ctx.db
      .collection("processedEvents")
      .doc(event.id)
      .delete()
      .catch(() => undefined);
    throw error;
  }
}

async function applyEvent(event: Stripe.Event, ctx: WebhookContext): Promise<ProcessResult> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const uid = session.client_reference_id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!uid || !subscriptionId) return "ignored";
      const subscription = await ctx.getSubscription(subscriptionId);
      await writeSubscription(ctx.db, uid, subscription);
      return "processed";
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const uid = await resolveUid(ctx.db, subscription);
      if (!uid) return "ignored";
      await writeSubscription(ctx.db, uid, subscription);
      return "processed";
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const uid = await resolveUid(ctx.db, subscription);
      if (!uid) return "ignored";
      await writeSubscription(ctx.db, uid, subscription, "canceled");
      return "processed";
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const uid = customerId ? await uidByCustomer(ctx.db, customerId) : null;
      if (!uid) return "ignored";
      await ctx.db
        .collection("subscriptions")
        .doc(uid)
        .set({ status: "past_due", updatedAt: Timestamp.now() }, { merge: true });
      return "processed";
    }
    default:
      return "ignored";
  }
}
