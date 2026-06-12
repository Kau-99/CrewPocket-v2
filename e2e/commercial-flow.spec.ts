import { expect, test } from "@playwright/test";

import { clickLinkAndWait, signupAndOnboard } from "./helpers";

/**
 * E2E comerciais da SPEC §10:
 * (1) signup → onboarding → client → job → custos → margem correta
 * (3) estimate → PDF → convert to job
 * (4) job → invoice → mark paid
 */

test.describe.configure({ mode: "serial" });

const email = `e2e-com-${Date.now()}@crewpocket.test`;
const password = "secret123";
const jobName = `Insulation ${Date.now()}`;
const estimateTitle = `Garage attic ${Date.now()}`;

test("client → job → custos → margem correta → invoice → mark paid", async ({ page, request }) => {
  await signupAndOnboard(page, request, email, password);

  // ── client ──
  await page.goto("/clients");
  await page.getByRole("button", { name: "New client" }).first().click();
  await page.getByLabel("Name").fill("ACME Builders");
  await page.getByLabel("Email", { exact: true }).fill("acme@example.com");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "ACME Builders" })).toBeVisible({
    timeout: 15_000,
  });

  // ── job com cliente e valor ──
  await page.goto("/jobs");
  await page.getByRole("button", { name: "New job" }).first().click();
  await page.getByLabel("Job name").fill(jobName);
  await page.getByLabel("Scheduled date").fill("2026-06-20");
  await page.getByLabel("Value ($)").fill("1000.00");
  await page.getByLabel("Client").click();
  await page.getByRole("option", { name: "ACME Builders" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: jobName })).toBeVisible({ timeout: 15_000 });

  // ── custos no detail → margem correta ──
  await clickLinkAndWait(page, jobName, /\/jobs\/(?!board)[\w-]+$/);
  await page.getByLabel("Item").fill("Foam boards");
  await page.getByLabel("Qty").fill("10");
  await page.getByLabel("Unit cost").fill("25.00");
  await page.getByRole("button", { name: "Add cost" }).click();
  // $1000 − $250 = $750 (75%) — fórmula §5
  await expect(page.getByText("$750.00 (75%)")).toBeVisible({ timeout: 15_000 });

  // ── job → completed → invoice ──
  await page.getByRole("button", { name: "Draft" }).click();
  await page.getByRole("button", { name: "Active", exact: true }).click();
  await page.getByRole("button", { name: "Completed" }).click();
  await page.getByRole("button", { name: "Create invoice" }).click();
  await page.waitForURL(/\/invoices\/[\w-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /INV-\d+/ })).toBeVisible({ timeout: 15_000 });

  // ── mark paid (asserta o badge — toast é efêmero) ──
  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible({ timeout: 15_000 });
});

test("estimate → PDF → convert to job", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "download de PDF validado uma vez basta");
  // sessão persistida? novo contexto → login
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });

  await page.goto("/estimates");
  await page.getByRole("button", { name: "New estimate" }).first().click();
  await page.getByLabel("Title").fill(estimateTitle);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/estimates\/[\w-]+$/, { timeout: 15_000 });

  // edita o line item e salva — totais ao vivo
  await page.getByLabel("Unit price").first().fill("500.00");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 10_000 });

  // PDF real via blob (ADR-020)
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^EST-\d+\.pdf$/);

  // conversão atômica → job
  await page.getByRole("button", { name: "Convert to Job" }).click();
  await page.waitForURL(/\/jobs\/[\w-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: estimateTitle })).toBeVisible({
    timeout: 15_000,
  });
  // valor do job = total do estimate
  await expect(page.getByText("$500.00").first()).toBeVisible();
});
