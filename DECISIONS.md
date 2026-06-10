# DECISIONS.md — Architecture Decision Records

Formato: contexto → decisão → consequência (≤ 5 linhas cada).

---

## ADR-001 — Projeto permanece em pasta sincronizada pelo OneDrive

**Data:** 2026-06-10 · **Fase:** 0
Contexto: o diretório de trabalho está em `OneDrive\Imagens\Documentos\CrewPocket v2`. Sync pode travar `node_modules` e degradar builds.
Decisão: prosseguir no local atual por escolha do usuário (alertado). `node_modules`, `.next` e caches estão no `.gitignore`.
Consequência: se houver locks/lentidão, mover para `C:\dev\crewpocket-v2` — o repo git torna a mudança trivial.

## ADR-002 — Next.js pinado em 14.2.x com React 18

**Data:** 2026-06-10 · **Fase:** 0
Contexto: a spec exige "14.2+". Versões 15+ mudam defaults de caching e exigem React 19, que tem atrito com @react-pdf/renderer e parte do ecossistema listado na stack.
Decisão: pinar `next@14.2.x` + `react@18.3.x` — satisfaz a versão mínima com máxima compatibilidade entre as libs fixadas na seção 2.
Consequência: upgrade para 15+ é uma migração deliberada futura, fora do escopo da v2.

## ADR-003 — Scaffold manual em vez de create-next-app

**Data:** 2026-06-10 · **Fase:** 0
Contexto: `create-next-app .` deriva o nome do pacote do nome da pasta; "CrewPocket v2" (espaço + maiúsculas) é nome npm inválido e o CLI aborta.
Decisão: escrever package.json/tsconfig/configs manualmente com `"name": "crewpocket"`.
Consequência: controle total das versões; nenhum artefato de template não usado.

## ADR-004 — CSP com nonce adiada para a Fase 1

**Data:** 2026-06-10 · **Fase:** 0
Contexto: seção 6.5 exige CSP sem `unsafe-inline` via nonce; no Next 14 isso requer `middleware.ts` gerando nonce por request, que interage com o shell autenticado (Fase 1).
Decisão: Fase 0 entrega os headers estáticos (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) em `next.config.mjs`; CSP+nonce entra junto com o middleware de auth na Fase 1.
Consequência: nenhum header de segurança ausente no deploy final; apenas sequenciamento.

## ADR-005 — shadcn/ui inicializado manualmente (components.json + tokens)

**Data:** 2026-06-10 · **Fase:** 0
Contexto: o CLI `shadcn init` mais recente assume Tailwind v4/React 19; a stack fixa usa Tailwind 3.4 + React 18.
Decisão: criar `components.json`, CSS variables (tema dark `#0b0f17` / primary `#3b9eff`) e `cn()` manualmente — o mesmo resultado do init; componentes serão adicionados via `shadcn@2.3.0 add <comp>` (versão compatível com Tailwind 3).
Consequência: tema dark da seção 8 aplicado desde o início; CLI pinada evita drift de major.

## ADR-006 — Regra de cross-feature imports via import/no-restricted-paths gerada por lista

**Data:** 2026-06-10 · **Fase:** 0
Contexto: a proibição "feature não importa de outra feature" precisa ser ESLint error (seção 2).
Decisão: `.eslintrc.cjs` gera zonas `import/no-restricted-paths` programaticamente a partir da lista de features; nova feature = adicionar 1 string ao array `FEATURES`.
Consequência: violação de fronteira quebra o lint; manutenção é uma linha por feature.

## ADR-007 — Proibição "segredo com `NEXT_PUBLIC_`" garantida por t3-env, não por lint

**Data:** 2026-06-10 · **Fase:** 0
Contexto: não há regra ESLint confiável para detectar semanticamente "segredo" num nome de env var.
Decisão: todo acesso a env passa por `src/env.ts` (@t3-oss/env-nextjs), que separa `server` de `client` e falha o build se uma var server for usada no client. `.env.example` documenta a fronteira.
Consequência: a garantia é estrutural (build quebra), mais forte que lint.

## ADR-008 — App Check desligado quando rodando contra emulators

**Data:** 2026-06-10 · **Fase:** 1
Contexto: o Firebase Emulator Suite não tem backend de App Check; inicializar ReCaptchaV3Provider com chave demo quebraria o dev local.
Decisão: `lib/firebase/client.ts` só inicializa App Check quando `NEXT_PUBLIC_USE_EMULATORS=false`; em produção real é obrigatório, com debug token via env apenas em dev contra projeto real.
Consequência: dev local sem fricção; checklist da Fase 7 deve validar App Check enforcement no projeto real.

## ADR-009 — Route guard client-side (sem session cookies)

**Data:** 2026-06-10 · **Fase:** 1
Contexto: a sessão vive no Firebase Auth client SDK (IndexedDB); o middleware Edge não consegue validar o token sem Admin SDK/session cookies — que a SPEC não pede.
Decisão: guard no layout do grupo `(app)` via `useAuth` com redirect `/login?returnTo=…` (sanitizado contra open redirect); a garantia real de dados é das Firestore Rules, não do guard.
Consequência: paywall/dados protegidos server-side pelas rules; o guard é UX. Compatível com offline-first (sessão local funciona sem rede).

## ADR-010 — CSP com nonce ativa apenas em produção

**Data:** 2026-06-10 · **Fase:** 1
Contexto: o dev server do Next exige `unsafe-eval`/inline para HMR e react-refresh, incompatível com a CSP da SPEC §6.5.
Decisão: `src/middleware.ts` aplica a CSP completa (nonce + strict-dynamic, sem unsafe-inline para scripts) somente quando `NODE_ENV=production`; dev fica sem CSP.
Consequência: o smoke E2E valida os headers estáticos; a CSP em si deve ser verificada no build de produção (Fase 7 / Lighthouse).
