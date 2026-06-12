import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Concede trial via REST dos emulators (equivale ao webhook do Stripe ter
 * processado o checkout) — ADR-022.
 */
export async function grantTrial(request: APIRequestContext, email: string, password: string) {
  const signIn = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key",
    { data: { email, password, returnSecureToken: true } },
  );
  const { localId } = (await signIn.json()) as { localId: string };

  const response = await request.patch(
    `http://127.0.0.1:8080/v1/projects/demo-crewpocket/databases/(default)/documents/subscriptions/${localId}`,
    {
      headers: { Authorization: "Bearer owner" },
      data: {
        fields: {
          status: { stringValue: "trialing" },
          plan: { stringValue: "pro" },
          interval: { stringValue: "monthly" },
          stripeCustomerId: { stringValue: "cus_e2e" },
          stripeSubscriptionId: { stringValue: "sub_e2e" },
          currentPeriodEnd: { timestampValue: "2030-01-01T00:00:00Z" },
          cancelAtPeriodEnd: { booleanValue: false },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      },
    },
  );
  expect(response.ok()).toBe(true);
}

/** E2E_LOG=1 espelha console/erros do browser no stdout do teste. */
export function tapConsole(page: Page) {
  if (!process.env.E2E_LOG) return;
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      // eslint-disable-next-line no-console -- diagnóstico de e2e opt-in
      console.log(`[browser:${message.type()}] ${message.text().slice(0, 300)}`);
    }
  });
  page.on("pageerror", (error) => {
    // eslint-disable-next-line no-console -- diagnóstico de e2e opt-in
    console.log(`[pageerror] ${error.message.slice(0, 300)}`);
  });
}

/** signup → onboarding → paywall → trial → dashboard. */
export async function signupAndOnboard(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  tapConsole(page);
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await page.getByLabel("Company name").fill("E2E Insulation LLC");
  await page.getByRole("button", { name: "Get started" }).click();

  await expect(page.getByRole("heading", { name: "Start your 14-day free trial" })).toBeVisible({
    timeout: 15_000,
  });
  await grantTrial(request, email, password);
  // normalmente o onSnapshot desbloqueia em tempo real; em cold start do
  // emulator (ou sob carga da suite) o watch pode atrasar bastante —
  // reload lê o doc direto do servidor, com até 3 tentativas
  const dashboardHeading = page.getByRole("heading", { name: "Dashboard" });
  let visible = await dashboardHeading
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  for (let attempt = 0; attempt < 3 && !visible; attempt += 1) {
    await page.reload();
    visible = await dashboardHeading
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
  }
  await expect(dashboardHeading).toBeVisible();
}

/** Clique em link com retry (hidratação do dev server pode engolir o 1º). */
export async function clickLinkAndWait(page: Page, name: string, urlPattern: RegExp) {
  const link = page.getByRole("link", { name });
  await link.click();
  try {
    await page.waitForURL(urlPattern, { timeout: 5_000 });
  } catch {
    await link.click();
    await page.waitForURL(urlPattern, { timeout: 15_000 });
  }
}
