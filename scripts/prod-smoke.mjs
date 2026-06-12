// Smoke test descartável pós-deploy: signup real em produção + limpeza.
// Uso: node scripts/prod-smoke.mjs
import { chromium } from "@playwright/test";

const BASE = "https://crewpocket-v2.vercel.app";
const API_KEY = "AIzaSyDvmZ4ed_uuhiYZkO-sYmGgTIw4BCeiRo4";
const email = `prod-smoke-${Date.now()}@crewpocket.test`;
const password = "Sm0ke!" + Date.now();

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
page.on("response", async (r) => {
  if (r.status() >= 400) {
    let body = "";
    try {
      body = (await r.text()).slice(0, 400);
    } catch {}
    console.log(`HTTP ${r.status()} ${r.url().slice(0, 120)}\n  ${body.replace(/\s+/g, " ")}`);
  }
});

try {
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  // chegar no onboarding prova: auth OK (sem unauthorized-domain) + hidratação OK
  await page.getByLabel("Company name").waitFor({ timeout: 20_000 });
  console.log("SIGNUP OK — onboarding visível");

  await page.getByLabel("Company name").fill("Smoke Test LLC");
  await page.getByRole("button", { name: "Get started" }).click();

  // sem Stripe real o esperado é o paywall
  await page
    .getByRole("heading", { name: "Start your 14-day free trial" })
    .waitFor({ timeout: 20_000 });
  console.log("ONBOARDING OK — paywall visível (esperado sem Stripe)");
} catch (e) {
  console.log("FALHA: " + e.message.split("\n")[0]);
  console.log("URL atual: " + page.url());
} finally {
  await browser.close();
}

const cspErrors = errors.filter((e) => /Content Security Policy|CSP/i.test(e));
const authErrors = errors.filter((e) => /unauthorized-domain|invalid-api-key/i.test(e));
console.log(`erros de CSP: ${cspErrors.length}`);
console.log(`erros de auth-domain: ${authErrors.length}`);
const relevant = errors.filter((e) => !/app-check|appcheck|recaptcha|app_check/i.test(e));
if (relevant.length) console.log("outros erros de console:\n" + relevant.join("\n"));
else console.log("nenhum outro erro de console (ignorando App Check/reCAPTCHA placeholder)");

// ── limpeza: apaga o usuário de teste via REST ──
const signIn = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
);
if (signIn.ok) {
  const { idToken, localId } = await signIn.json();
  // settings doc criado no primeiro login — rules permitem o owner deletar
  await fetch(
    `https://firestore.googleapis.com/v1/projects/jobcost-pro-4301f/databases/(default)/documents/settings/${localId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } },
  ).catch(() => {});
  const del = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  console.log(
    `limpeza: usuário de teste ${del.ok ? "apagado" : "NÃO apagado (apagar manualmente: " + email + ")"}`,
  );
} else {
  console.log("limpeza: signin falhou — verificar usuário " + email);
}
