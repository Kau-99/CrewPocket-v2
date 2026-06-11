import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as webhookPost } from "@/app/api/stripe/webhook/route";
import { getAdminDb } from "@/lib/firebase/admin";
import { processStripeEvent, type WebhookContext } from "@/lib/stripe/webhook";

const UID = "user-a";
const CUSTOMER = "cus_123";

const db = getAdminDb();

function fakeSubscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
  return {
    id: "sub_123",
    object: "subscription",
    customer: CUSTOMER,
    status: "trialing",
    cancel_at_period_end: false,
    current_period_end: 1_893_456_000, // 2030-01-01
    metadata: { uid: UID },
    items: { data: [{ price: { id: "price_pro_monthly" } }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function fakeEvent(id: string, type: string, object: unknown): Stripe.Event {
  return {
    id,
    object: "event",
    type,
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    data: { object },
  } as unknown as Stripe.Event;
}

function ctx(subscription = fakeSubscription()): WebhookContext {
  return { db, getSubscription: () => Promise.resolve(subscription) };
}

async function readSubscriptionDoc() {
  const snapshot = await db.collection("subscriptions").doc(UID).get();
  return snapshot.data();
}

beforeEach(async () => {
  // limpa o projeto demo-crewpocket no emulator entre testes
  await fetch(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-crewpocket/databases/(default)/documents",
    { method: "DELETE" },
  );
});

describe("processStripeEvent — tabela de eventos da SPEC §6.1", () => {
  it("checkout.session.completed grava subscriptions/{uid} a partir do subscription object", async () => {
    const event = fakeEvent("evt_1", "checkout.session.completed", {
      client_reference_id: UID,
      subscription: "sub_123",
    });

    const result = await processStripeEvent(event, ctx());
    expect(result).toBe("processed");

    const doc = await readSubscriptionDoc();
    expect(doc).toMatchObject({
      status: "trialing",
      plan: "pro",
      interval: "monthly",
      stripeCustomerId: CUSTOMER,
      stripeSubscriptionId: "sub_123",
      cancelAtPeriodEnd: false,
    });
  });

  it("customer.subscription.updated sincroniza status, plan, currentPeriodEnd e cancelAtPeriodEnd", async () => {
    const subscription = fakeSubscription({
      status: "active",
      cancel_at_period_end: true,
      items: { data: [{ price: { id: "price_solo_annual" } }] },
    });
    const result = await processStripeEvent(
      fakeEvent("evt_2", "customer.subscription.updated", subscription),
      ctx(),
    );
    expect(result).toBe("processed");

    const doc = await readSubscriptionDoc();
    expect(doc).toMatchObject({
      status: "active",
      plan: "solo",
      interval: "annual",
      cancelAtPeriodEnd: true,
    });
  });

  it("customer.subscription.deleted marca status canceled", async () => {
    const result = await processStripeEvent(
      fakeEvent("evt_3", "customer.subscription.deleted", fakeSubscription({ status: "canceled" })),
      ctx(),
    );
    expect(result).toBe("processed");
    expect(await readSubscriptionDoc()).toMatchObject({ status: "canceled" });
  });

  it("invoice.payment_failed marca past_due preservando o resto (uid via customers/)", async () => {
    await db.collection("customers").doc(UID).set({ stripeCustomerId: CUSTOMER });
    await processStripeEvent(
      fakeEvent("evt_4a", "customer.subscription.updated", fakeSubscription({ status: "active" })),
      ctx(),
    );

    const result = await processStripeEvent(
      fakeEvent("evt_4b", "invoice.payment_failed", { object: "invoice", customer: CUSTOMER }),
      ctx(),
    );
    expect(result).toBe("processed");
    expect(await readSubscriptionDoc()).toMatchObject({ status: "past_due", plan: "pro" });
  });

  it("evento duplicado é idempotente (SPEC §6.1): segunda entrega não reprocessa", async () => {
    const subscription = fakeSubscription({ status: "active" });
    const event = fakeEvent("evt_dup", "customer.subscription.updated", subscription);

    expect(await processStripeEvent(event, ctx())).toBe("processed");

    // mesma id com payload diferente — não pode sobrescrever
    const tampered = fakeEvent(
      "evt_dup",
      "customer.subscription.updated",
      fakeSubscription({ status: "canceled" }),
    );
    expect(await processStripeEvent(tampered, ctx())).toBe("duplicate");
    expect(await readSubscriptionDoc()).toMatchObject({ status: "active" });
  });

  it("evento fora da tabela é ignorado sem erro", async () => {
    const result = await processStripeEvent(
      fakeEvent("evt_other", "customer.created", { id: CUSTOMER }),
      ctx(),
    );
    expect(result).toBe("ignored");
  });
});

describe("rota do webhook — assinatura (SPEC §6.1/§9)", () => {
  const stripe = new Stripe("sk_test_dummy", { apiVersion: "2024-06-20" });

  function signedRequest(payload: string, secret = "whsec_test"): Request {
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": signature },
    });
  }

  it("assinatura válida sobre o raw body → 200 e doc gravado", async () => {
    const payload = JSON.stringify(
      fakeEvent("evt_route_1", "customer.subscription.updated", fakeSubscription()),
    );
    const response = await webhookPost(signedRequest(payload));
    expect(response.status).toBe(200);
    expect(await readSubscriptionDoc()).toMatchObject({ stripeSubscriptionId: "sub_123" });
  });

  it("assinatura inválida → 400", async () => {
    const payload = JSON.stringify(fakeEvent("evt_route_2", "customer.subscription.updated", {}));
    const response = await webhookPost(signedRequest(payload, "whsec_WRONG"));
    expect(response.status).toBe(400);
  });

  it("sem header de assinatura → 400", async () => {
    const response = await webhookPost(
      new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
  });

  it("entrega duplicada na rota → 200 sem reprocessar", async () => {
    const payload = JSON.stringify(
      fakeEvent("evt_route_3", "customer.subscription.updated", fakeSubscription()),
    );
    expect((await webhookPost(signedRequest(payload))).status).toBe(200);
    expect((await webhookPost(signedRequest(payload))).status).toBe(200);
  });
});
