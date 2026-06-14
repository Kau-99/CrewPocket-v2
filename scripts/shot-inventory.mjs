import { chromium, devices } from "@playwright/test";

const PASS = process.env.SMOKE_PASS;
const BASE = "https://crewpocket-v2.vercel.app";
const out = process.env.TEMP ?? ".";

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.getByLabel("Email").fill("kaua.honorato10@gmail.com");
await page.getByLabel("Password", { exact: true }).fill(PASS);
await page.getByRole("button", { name: "Log in" }).click();
await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 20_000 });

await page.goto(`${BASE}/inventory`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
console.log("inventory overflow-x:", overflow);
await page.getByRole("tab", { name: "Equipment" }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "New equipment" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/inv-equipment.png`, fullPage: false });
console.log("print salvo");
await browser.close();
