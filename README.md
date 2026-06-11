# CrewPocket v2

SaaS de gestão de field service para empreiteiros americanos (insulation, HVAC, construção leve). Next.js 14 (App Router) + TypeScript strict + Firebase + Stripe.

> **Contrato do projeto:** [SPEC.md](./SPEC.md) · **Decisões:** [DECISIONS.md](./DECISIONS.md)

## Requisitos

- Node 20+
- pnpm 9 (`npm i -g pnpm@9`)
- Java 11+ (para os Firebase emulators)

## Comandos

| Comando                                                | O que faz                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `pnpm dev`                                             | Dev server em http://localhost:3000                                   |
| `pnpm build` / `pnpm start`                            | Build e serve de produção                                             |
| `pnpm typecheck`                                       | `tsc --noEmit`                                                        |
| `pnpm lint`                                            | ESLint com zero warnings tolerados                                    |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Unit tests (Vitest)                                                   |
| `pnpm test:e2e`                                        | Playwright (sobe o dev server sozinho)                                |
| `pnpm emulators`                                       | Firebase emulators (Auth 9099, Firestore 8080, Storage 9199, UI 4000) |
| `pnpm format`                                          | Prettier em tudo                                                      |

## Setup local

1. `pnpm install`
2. Copie `.env.example` para `.env.local`. Para desenvolver contra os emulators, os valores `demo-*` já criados funcionam (`NEXT_PUBLIC_USE_EMULATORS=true`).
3. `pnpm emulators` num terminal, `pnpm dev` noutro.

> Setup completo de Firebase (projeto real, App Check) será documentado na Fase 7.

## Stripe (billing)

1. No [Dashboard do Stripe](https://dashboard.stripe.com/test/products) (test mode), crie os produtos **Solo** e **Pro**, cada um com price mensal e anual (recurring).
2. Copie os 4 price IDs para o `.env.local` (`STRIPE_PRICE_SOLO_MONTHLY`, `STRIPE_PRICE_SOLO_ANNUAL`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`) e a secret key (`STRIPE_SECRET_KEY`).
3. Webhook local: `stripe listen --forward-to localhost:3000/api/stripe/webhook` — o comando imprime o `whsec_...`; coloque em `STRIPE_WEBHOOK_SECRET`.
4. Fluxo de teste: app → Billing → Start free trial → checkout com cartão `4242 4242 4242 4242` → o webhook grava `subscriptions/{uid}` e o app desbloqueia em tempo real.
5. Acesso cortesia (sem Stripe): `pnpm dlx tsx scripts/grant-access.ts <email> [solo|pro] [dias]` — contra os emulators, exporte antes `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` e `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.

Eventos tratados: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` — idempotentes via `processedEvents/{event.id}`.

## Estrutura

Ver SPEC.md §3. Resumo: `src/app` (rotas), `src/features/<domínio>` (ilhas — não importam umas das outras; lint quebra), `src/lib` (Firebase/Stripe/utils), `src/hooks`, `src/i18n` (dicionário tipado en/es).

## Nota: projeto dentro do OneDrive

O OneDrive desidrata arquivos novos de `.next` e quebra o dev server (`EINVAL readlink`). Nesta máquina, `.next` é uma **junction** para `%LOCALAPPDATA%\crewpocket\next`, com uma junction irmã `%LOCALAPPDATA%\crewpocket\node_modules` apontando para o `node_modules` do projeto — necessária para pacotes externalizados pelo Next (firebase-admin) resolverem em runtime (ADR-017). Se você clonar para fora do OneDrive, ignore; se dentro, recrie com:

```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\crewpocket\next"
New-Item -ItemType Junction -Path "$env:LOCALAPPDATA\crewpocket\node_modules" -Target "<repo>\node_modules"
New-Item -ItemType Junction -Path .next -Target "$env:LOCALAPPDATA\crewpocket\next"
```

## Qualidade

- Pre-commit: lint-staged (ESLint + Prettier) via Husky
- CI (GitHub Actions): lint → typecheck → test → build em todo push/PR
- Proibições da SPEC §2 são erros de lint (any, alert, dangerouslySetInnerHTML, console.log, cross-feature imports)
