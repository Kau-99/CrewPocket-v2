/* eslint-disable no-console -- saída de CLI */
/**
 * Migração v1 → v2 (SPEC §10).
 *
 * Conversões aplicadas:
 *   - dólares float → centavos int (Math.round(x * 100))
 *   - datas em millis (number) → Firestore Timestamp
 *   - status capitalizado ("Active") → lowercase ("active")
 *   - costs v1 com campo `total` → derivado (qty × unitCost), `total` descartado
 *   - docs ganham id uuid, ownerId, schemaVersion: 2 e timestamps
 *
 * Uso (DRY-RUN é o default — nada é escrito):
 *   pnpm dlx tsx scripts/migrate-v1.ts <uid-destino>
 *   pnpm dlx tsx scripts/migrate-v1.ts <uid-destino> --apply
 *
 * Origem: projeto v1 via GOOGLE_APPLICATION_CREDENTIALS + V1_PROJECT_ID.
 * Destino: emulator (FIRESTORE_EMULATOR_HOST) ou o mesmo credential.
 * Coleções v1 esperadas: "clients" e "jobs" (ajustar V1_* abaixo se diferir).
 */
import { randomUUID } from "node:crypto";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { clientSchema } from "../src/features/clients/schemas";
import { jobSchema } from "../src/features/jobs/schemas";

const V1_CLIENTS = "clients";
const V1_JOBS = "jobs";

const [ownerId, applyFlag] = process.argv.slice(2);
const apply = applyFlag === "--apply";

if (!ownerId) {
  console.error("uso: tsx scripts/migrate-v1.ts <uid-destino> [--apply]");
  process.exit(1);
}

const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId =
  process.env.V1_PROJECT_ID ?? process.env.FIREBASE_ADMIN_PROJECT_ID ?? "demo-crewpocket";

if (getApps().length === 0) {
  initializeApp(useEmulator ? { projectId } : { credential: applicationDefault(), projectId });
}
const db = getFirestore();

/* ── conversores ───────────────────────────────────────────────────── */

function dollarsToCents(value: unknown): number {
  const dollars = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
}

function millisToTimestamp(value: unknown): Timestamp {
  const millis = typeof value === "number" ? value : Number(value ?? Date.now());
  return Timestamp.fromMillis(Number.isFinite(millis) && millis > 0 ? millis : Date.now());
}

function lowerStatus(value: unknown, allowed: string[], fallback: string): string {
  const lowered = String(value ?? "").toLowerCase();
  return allowed.includes(lowered) ? lowered : fallback;
}

function str(value: unknown, max: number): string {
  return String(value ?? "").slice(0, max);
}

function base() {
  const now = Timestamp.now();
  return { id: randomUUID(), ownerId, createdAt: now, updatedAt: now, schemaVersion: 2 as const };
}

interface V1Cost {
  name?: unknown;
  qty?: unknown;
  cost?: unknown;
  unitCost?: unknown;
  total?: unknown; // descartado — sempre derivado na v2
  category?: unknown;
}

function convertClient(data: Record<string, unknown>) {
  return {
    ...base(),
    name: str(data.name, 120) || "Unnamed",
    email: str(data.email, 120),
    phone: str(data.phone, 30),
    address: str(data.address, 300),
    city: str(data.city, 100),
    state: str(data.state, 2),
    zip: str(data.zip, 10),
    notes: str(data.notes, 2000),
    isArchived: Boolean(data.archived ?? data.isArchived ?? false),
  };
}

function convertJob(data: Record<string, unknown>) {
  const costs = (Array.isArray(data.costs) ? (data.costs as V1Cost[]) : []).map((cost) => ({
    id: randomUUID(),
    name: str(cost.name, 200) || "Item",
    category: lowerStatus(
      cost.category,
      ["material", "labor", "equipment", "subcontractor", "other"],
      "material",
    ) as "material",
    qty: Number(cost.qty ?? 1) || 0,
    unitCostCents: dollarsToCents(cost.unitCost ?? cost.cost),
  }));

  return {
    ...base(),
    name: str(data.name ?? data.title, 200) || "Untitled job",
    clientId: null, // vínculos v1 por nome — religar manualmente se preciso
    clientName: str(data.client ?? data.clientName, 120),
    status: lowerStatus(
      data.status,
      ["lead", "quoted", "draft", "active", "completed", "invoiced"],
      "draft",
    ),
    priority: lowerStatus(data.priority, ["low", "normal", "high"], "normal"),
    paymentStatus: lowerStatus(data.paymentStatus, ["unpaid", "partial", "paid"], "unpaid"),
    date: millisToTimestamp(data.date),
    deadline: data.deadline ? millisToTimestamp(data.deadline) : null,
    address: str(data.address, 300),
    zip: str(data.zip, 10),
    description: str(data.description, 2000),
    notes: str(data.notes, 2000),
    tags: (Array.isArray(data.tags) ? data.tags : []).map((tag) => str(tag, 30)).slice(0, 20),
    costs: costs.slice(0, 100),
    valueCents: dollarsToCents(data.value ?? data.price),
    depositCents: dollarsToCents(data.deposit),
    paidCents: dollarsToCents(data.paid),
    paidAt: data.paidAt ? millisToTimestamp(data.paidAt) : null,
    photoUrls: [],
    estimateId: null,
    invoiceId: null,
  };
}

/* ── execução ──────────────────────────────────────────────────────── */

interface Report {
  read: number;
  valid: number;
  invalid: { docId: string; issues: string }[];
}

async function migrate(
  source: string,
  target: string,
  convert: (data: Record<string, unknown>) => unknown,
  schema: {
    safeParse: (value: unknown) => {
      success: boolean;
      error?: { issues: { path: (string | number)[]; code: string }[] };
      data?: unknown;
    };
  },
): Promise<Report> {
  const snapshot = await db.collection(source).get();
  const report: Report = { read: snapshot.size, valid: 0, invalid: [] };

  for (const docSnap of snapshot.docs) {
    const converted = convert(docSnap.data());
    const parsed = schema.safeParse(converted);
    if (!parsed.success) {
      report.invalid.push({
        docId: docSnap.id,
        issues: (parsed.error?.issues ?? [])
          .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
          .join("; "),
      });
      continue;
    }
    report.valid += 1;
    if (apply) {
      const data = parsed.data as Record<string, unknown> & { id: string };
      await db.collection(target).doc(data.id).set(data);
    }
  }
  return report;
}

async function main(): Promise<void> {
  console.log(`migração v1 → v2 | destino uid=${ownerId} | ${apply ? "APPLY" : "DRY-RUN"}`);

  const clients = await migrate(V1_CLIENTS, "clients", convertClient, clientSchema);
  const jobs = await migrate(V1_JOBS, "jobs", convertJob, jobSchema);

  for (const [name, report] of [
    ["clients", clients],
    ["jobs", jobs],
  ] as const) {
    console.log(
      `\n${name}: lidos=${report.read} válidos=${report.valid} inválidos=${report.invalid.length}`,
    );
    for (const item of report.invalid) {
      console.log(`  ✗ ${item.docId}: ${item.issues}`);
    }
  }
  if (!apply) console.log("\n(dry-run — nada foi escrito; use --apply para gravar)");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
