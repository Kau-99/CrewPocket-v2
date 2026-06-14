import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import { buildDefaultSettings } from "@/features/settings/schemas";
import {
  makeClient,
  makeCrewMember,
  makeEquipmentItem,
  makeEstimate,
  makeEstimateTemplate,
  makeInventoryItem,
  makeInvoice,
  makeJob,
  makeMileageLog,
  makePricebookItem,
  makeSubscription,
  makeTimeLog,
} from "@/test/factories";

const OWNER = "user-a";
const INTRUDER = "user-b";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-crewpocket-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

function asUser(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

/** Matriz: todas as coleções owner-only com suas factories (SPEC §6.3). */
const OWNED_COLLECTIONS = [
  ["clients", makeClient],
  ["jobs", makeJob],
  ["estimates", makeEstimate],
  ["estimateTemplates", makeEstimateTemplate],
  ["invoices", makeInvoice],
  ["crewMembers", makeCrewMember],
  ["timeLogs", makeTimeLog],
  ["mileageLogs", makeMileageLog],
  ["inventoryItems", makeInventoryItem],
  ["equipmentItems", makeEquipmentItem],
  ["pricebookItems", makePricebookItem],
] as const;

describe.each(OWNED_COLLECTIONS)("coleção %s", (collectionName, factory) => {
  it("dono cria, lê, atualiza e deleta o próprio doc", async () => {
    const data = factory(OWNER);
    const ref = doc(asUser(OWNER), collectionName, data.id);
    await assertSucceeds(setDoc(ref, data));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { updatedAt: data.updatedAt }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("user B não lê nem escreve docs de user A", async () => {
    const data = factory(OWNER);
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), collectionName, data.id), data);
    });

    const intruderRef = doc(asUser(INTRUDER), collectionName, data.id);
    await assertFails(getDoc(intruderRef));
    await assertFails(updateDoc(intruderRef, { updatedAt: data.updatedAt }));
    await assertFails(deleteDoc(intruderRef));
    // criar doc atribuindo ownerId de outro usuário também falha
    const forged = factory(OWNER);
    await assertFails(setDoc(doc(asUser(INTRUDER), collectionName, forged.id), forged));
  });

  it("update não consegue alterar ownerId nem createdAt", async () => {
    const data = factory(OWNER);
    const ref = doc(asUser(OWNER), collectionName, data.id);
    await assertSucceeds(setDoc(ref, data));
    await assertFails(updateDoc(ref, { ownerId: INTRUDER }));
    await assertFails(updateDoc(ref, { createdAt: data.updatedAt }));
  });
});

describe("subscriptions (só Admin SDK escreve)", () => {
  it("dono lê a própria subscription; ninguém escreve pelo client", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "subscriptions", OWNER), makeSubscription());
    });

    await assertSucceeds(getDoc(doc(asUser(OWNER), "subscriptions", OWNER)));
    await assertFails(getDoc(doc(asUser(INTRUDER), "subscriptions", OWNER)));
    // nem o próprio dono escreve (SPEC §2/§6.3)
    await assertFails(setDoc(doc(asUser(OWNER), "subscriptions", OWNER), makeSubscription()));
    await assertFails(updateDoc(doc(asUser(OWNER), "subscriptions", OWNER), { plan: "pro" }));
  });
});

describe("customers e processedEvents (lockdown total)", () => {
  it("nem o dono lê ou escreve", async () => {
    await assertFails(getDoc(doc(asUser(OWNER), "customers", OWNER)));
    await assertFails(setDoc(doc(asUser(OWNER), "customers", OWNER), { stripeCustomerId: "x" }));
    await assertFails(getDoc(doc(asUser(OWNER), "processedEvents", "evt_1")));
    await assertFails(setDoc(doc(asUser(OWNER), "processedEvents", "evt_1"), { seen: true }));
  });
});

describe("settings/{uid}", () => {
  it("dono cria/lê/atualiza; outro usuário não; delete proibido", async () => {
    const settings = buildDefaultSettings("Acme", "insulation");
    const ownRef = doc(asUser(OWNER), "settings", OWNER);
    await assertSucceeds(setDoc(ownRef, settings));
    await assertSucceeds(getDoc(ownRef));
    await assertSucceeds(updateDoc(ownRef, { companyName: "Acme LLC" }));
    await assertFails(deleteDoc(ownRef));

    await assertFails(getDoc(doc(asUser(INTRUDER), "settings", OWNER)));
    await assertFails(setDoc(doc(asUser(INTRUDER), "settings", OWNER), settings));
  });

  it("rejeita language/contadores inválidos", async () => {
    const settings = buildDefaultSettings("Acme", "insulation");
    const ownRef = doc(asUser(OWNER), "settings", OWNER);
    await assertFails(setDoc(ownRef, { ...settings, language: "pt" }));
    await assertFails(setDoc(ownRef, { ...settings, invoiceCounter: 0 }));
    await assertFails(setDoc(ownRef, { ...settings, minMarginPct: 101 }));
  });
});

describe("validações espelhando os Zod schemas", () => {
  it("enum inválido é rejeitado (job.status)", async () => {
    const job = makeJob(OWNER);
    await assertFails(setDoc(doc(asUser(OWNER), "jobs", job.id), { ...job, status: "archived" }));
  });

  it("string acima do limite é rejeitada (client.name > 120)", async () => {
    const client = makeClient(OWNER);
    await assertFails(
      setDoc(doc(asUser(OWNER), "clients", client.id), { ...client, name: "x".repeat(121) }),
    );
  });

  it("número fora do range é rejeitado (estimate.taxPct > 30, job.valueCents float)", async () => {
    const estimate = makeEstimate(OWNER);
    await assertFails(
      setDoc(doc(asUser(OWNER), "estimates", estimate.id), { ...estimate, taxPct: 31 }),
    );
    const job = makeJob(OWNER);
    await assertFails(setDoc(doc(asUser(OWNER), "jobs", job.id), { ...job, valueCents: 99.5 }));
  });

  it("timeLog com clockOut <= clockIn ou turno > 24h é rejeitado", async () => {
    const log = makeTimeLog(OWNER);
    await assertFails(
      setDoc(doc(asUser(OWNER), "timeLogs", log.id), { ...log, clockOut: log.clockIn }),
    );
    const { Timestamp } = await import("firebase/firestore");
    const tooLong = Timestamp.fromMillis(log.clockIn.toMillis() + 25 * 3_600_000);
    await assertFails(
      setDoc(doc(asUser(OWNER), "timeLogs", log.id), { ...log, clockOut: tooLong }),
    );
  });

  it("schemaVersion diferente de 2 é rejeitada", async () => {
    const client = makeClient(OWNER);
    await assertFails(
      setDoc(doc(asUser(OWNER), "clients", client.id), { ...client, schemaVersion: 1 }),
    );
  });

  it("coleção fora da lista cai no fallback deny", async () => {
    await assertFails(setDoc(doc(asUser(OWNER), "random", "x"), { ownerId: OWNER }));
  });
});
