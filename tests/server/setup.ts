/**
 * Envs ANTES dos imports dos módulos que leem src/env.ts.
 * Os price IDs precisam ser conhecidos para o mapeamento plan/interval.
 */
process.env.SKIP_ENV_VALIDATION = "1";
process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-crewpocket";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.STRIPE_PRICE_SOLO_MONTHLY = "price_solo_monthly";
process.env.STRIPE_PRICE_SOLO_ANNUAL = "price_solo_annual";
process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly";
process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_annual";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
