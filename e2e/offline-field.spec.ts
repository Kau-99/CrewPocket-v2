import { expect, test, type Page } from "@playwright/test";

/**
 * Fluxo crítico offline da SPEC §7:
 * sem sinal → clock-in → custo rápido no job → clock-out → volta sinal
 * → tudo sincroniza sem perda. Roda contra os Firebase emulators.
 */

test.describe.configure({ mode: "serial" });

const email = `e2e-${Date.now()}@crewpocket.test`;
const password = "secret123";
const jobName = `Attic job ${Date.now()}`;

async function signupAndOnboard(page: Page) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  // primeiro login → onboarding pede o nome da empresa
  await page.getByLabel("Company name").fill("E2E Insulation LLC");
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
}

test("fluxo crítico offline: clock-in → custo → clock-out → sync", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 30.2672, longitude: -97.7431 });

  await signupAndOnboard(page);

  // criar um job (online)
  await page.goto("/jobs");
  await page.getByRole("button", { name: "New job" }).first().click();
  await page.getByLabel("Job name").fill(jobName);
  await page.getByLabel("Scheduled date").fill("2026-06-15");
  await page.getByLabel("Value ($)").fill("1500.00");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: jobName })).toBeVisible({ timeout: 15_000 });

  // modo campo
  await page.goto("/field");
  await expect(page.getByRole("button", { name: "Clock In" })).toBeEnabled({ timeout: 15_000 });

  // ─── SEM SINAL ───
  await context.setOffline(true);

  // clock-in offline
  await page.getByRole("button", { name: "Clock In" }).click();
  await expect(page.getByRole("button", { name: "Clock Out" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("timer")).not.toHaveText("0:00:00", { timeout: 10_000 });

  // custo rápido offline
  await page.getByLabel("Item").fill("Cellulose bags");
  await page.getByLabel("Qty").fill("10");
  await page.getByLabel("Unit cost").fill("45.00");
  await page.getByRole("button", { name: "Add cost" }).click();
  await expect(page.getByText("Cost added to the job")).toBeVisible({ timeout: 10_000 });

  // clock-out offline
  await page.getByRole("button", { name: "Clock Out" }).click();
  await expect(page.getByRole("button", { name: "Clock In" })).toBeVisible({ timeout: 15_000 });
  // log fechado aparece nos recentes (cache local)
  await expect(page.getByText("Me (owner)").first()).toBeVisible({ timeout: 10_000 });

  // ─── VOLTA O SINAL ───
  await context.setOffline(false);
  // dar tempo para o Firestore sincronizar as escritas pendentes
  await page.waitForTimeout(4_000);

  // recarregar do servidor: nada se perdeu
  await page.reload();
  await expect(page.getByText("Me (owner)").first()).toBeVisible({ timeout: 15_000 });

  // o custo offline está no job, somado nos financials
  await page.goto("/jobs");
  const jobLink = page.getByRole("link", { name: jobName });
  await jobLink.click();
  try {
    await page.waitForURL(/\/jobs\/(?!board)[\w-]+$/, { timeout: 5_000 });
  } catch {
    // hidratação do dev server pode engolir o primeiro clique
    await jobLink.click();
    await page.waitForURL(/\/jobs\/(?!board)[\w-]+$/, { timeout: 15_000 });
  }
  await expect(page.getByRole("heading", { name: jobName })).toBeVisible({ timeout: 15_000 });
  // o nome do custo vive num input do editor inline
  await expect(page.getByRole("textbox", { name: "Item" }).first()).toHaveValue("Cellulose bags", {
    timeout: 15_000,
  });
  await expect(page.getByText("$450.00").first()).toBeVisible();

  // o time log offline está na tab Time
  await page.getByRole("tab", { name: "Time" }).click();
  await expect(page.getByText("Me (owner)")).toBeVisible({ timeout: 10_000 });
});
