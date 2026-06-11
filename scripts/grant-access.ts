/* eslint-disable no-console -- saída de CLI */
/**
 * Acesso cortesia (SPEC §6.1 item 6) — roda LOCALMENTE com Admin SDK,
 * nunca whitelist no código.
 *
 * Uso:
 *   pnpm dlx tsx scripts/grant-access.ts <email> [solo|pro] [dias]
 *
 * Contra os emulators:
 *   $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
 *   $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
 * Contra produção: $env:GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const [email, plan = "pro", daysArg = "90"] = process.argv.slice(2);
const days = Number(daysArg);

if (!email || (plan !== "solo" && plan !== "pro") || !Number.isFinite(days) || days <= 0) {
  console.error("uso: tsx scripts/grant-access.ts <email> [solo|pro] [dias]");
  process.exit(1);
}

const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "demo-crewpocket";

if (getApps().length === 0) {
  initializeApp(useEmulator ? { projectId } : { credential: applicationDefault(), projectId });
}

async function main(): Promise<void> {
  const user = await getAuth().getUserByEmail(email as string);
  await getFirestore()
    .collection("subscriptions")
    .doc(user.uid)
    .set({
      status: "active",
      plan,
      interval: "monthly",
      stripeCustomerId: "courtesy",
      stripeSubscriptionId: `courtesy-${Date.now()}`,
      currentPeriodEnd: Timestamp.fromMillis(Date.now() + days * 86_400_000),
      cancelAtPeriodEnd: true,
      updatedAt: Timestamp.now(),
    });
  console.log(`acesso ${plan} concedido a ${email} (uid ${user.uid}) por ${days} dias`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
