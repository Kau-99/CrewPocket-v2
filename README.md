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

> Setup completo de Firebase (projeto real, App Check) e Stripe (produtos, prices, `stripe listen`) será documentado nas Fases 1 e 5.

## Estrutura

Ver SPEC.md §3. Resumo: `src/app` (rotas), `src/features/<domínio>` (ilhas — não importam umas das outras; lint quebra), `src/lib` (Firebase/Stripe/utils), `src/hooks`, `src/i18n` (dicionário tipado en/es).

## Qualidade

- Pre-commit: lint-staged (ESLint + Prettier) via Husky
- CI (GitHub Actions): lint → typecheck → test → build em todo push/PR
- Proibições da SPEC §2 são erros de lint (any, alert, dangerouslySetInnerHTML, console.log, cross-feature imports)
