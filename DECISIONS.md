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

## ADR-011 — Busca e filtros client-side sobre as páginas carregadas

**Data:** 2026-06-10 · **Fase:** 2
Contexto: Firestore não tem full-text search; a SPEC pede busca com debounce + paginação por cursor (25/página).
Decisão: paginação por cursor no servidor (`startAfter`, índice ownerId+createdAt) e busca/filtros aplicados client-side sobre as páginas já carregadas — adequado à persona (1–5 pessoas, centenas de docs).
Consequência: busca não varre docs não carregados; se virar problema real, considerar prefix-query em `name` ou índice externo (v3).

## ADR-012 — Command palette (⌘K) e atalho "n" adiados para a fase de polish

**Data:** 2026-06-10 · **Fase:** 2
Contexto: os "padrões globais" da SPEC §8 incluem ⌘K e `n`; nenhuma fase os atribui explicitamente.
Decisão: implementar junto do Dashboard/notificações (Fase 6) ou polish (Fase 7), quando todas as rotas/ações navegáveis existirem.
Consequência: item rastreado aqui para a auditoria final da §10 não esquecer.

## ADR-013 — Fórmulas cross-domain usam tipagem estrutural, não imports de features

**Data:** 2026-06-10 · **Fase:** 2
Contexto: `jobLaborCostCents(job, timeLogs, crew)` (SPEC §5) precisa de TimeLog/CrewMember, mas features são ilhas (§3.2.1) — jobs não pode importar schemas de time-tracking/crew.
Decisão: a função vive em `features/jobs/utils.ts` com interfaces estruturais locais (`LaborLog`, `RatedMember`); o mesmo vale para o lineItemSchema duplicado em invoices (contrato de dados, não código).
Consequência: zero acoplamento entre features; o TypeScript valida a compatibilidade estrutural na composição (páginas).

## ADR-014 — Timer único por membro garantido por checagem client-side

**Data:** 2026-06-10 · **Fase:** 3
Contexto: SPEC §4.5 exige 1 timer aberto por crewMember. Transações do client SDK não fazem query, e unicidade real exigiria backend ou doc-id determinístico — incompatível com clock-in offline.
Decisão: `clockIn` consulta os timers abertos (cache offline incluso) e rejeita duplicidade com AppError("validation"); rules validam clockOut > clockIn e turno ≤ 24h.
Consequência: corrida real (2 devices offline simultâneos) pode duplicar — risco aceitável para equipes ≤ 5; revisitar se virar relato de campo.

## ADR-015 — Conteúdo cross-feature entra no Job detail via slot (ReactNode)

**Data:** 2026-06-10 · **Fase:** 3
Contexto: a tab Time e o labor cost vêm de time-tracking/crew, mas JobDetail vive em features/jobs (ilhas, §3.2.1).
Decisão: `JobDetail` recebe `timeTab: ReactNode` e `laborCostCents: number` como props; a página `jobs/[id]` compõe `<JobTimeLogs/>` e calcula o labor com `jobLaborCostCents`.
Consequência: padrão de slot reutilizável para a tab Photos (Fase 3+) e vínculos de estimate/invoice (Fase 4).

## ADR-016 — Escritas Firestore não aguardam ack do servidor

**Data:** 2026-06-10 · **Fase:** 3
Contexto: promises de setDoc/deleteDoc só resolvem com ack do servidor; aguardá-las travaria toda mutation offline (botões pendurados, toasts nunca disparam) — quebrando o fluxo crítico da §7.
Decisão: `commitWrite()` (lib/firestore/write.ts) dispara a escrita e loga rejeições em background; mutations resolvem imediatamente com o dado validado por `schema.parse`. UI reflete via onSnapshot/cache.
Consequência: rejeição de rules não vira toast (só log) — aceitável porque as rules espelham os schemas já validados no client; e2e offline cobre o fluxo completo.

## ADR-017 — `.next` é junction para fora do OneDrive; emulators via `emulators:exec` no Playwright

**Data:** 2026-06-10 · **Fase:** 3
Contexto: o OneDrive desidrata arquivos recém-criados do `.next` (EINVAL readlink — node_modules escapa por exclusão automática do OneDrive); e `emulators:start` morre com stdin fechado (NPE no rules runtime) sob qualquer process manager.
Decisão: `.next` → junction para `%LOCALAPPDATA%\crewpocket-next-cache`; webServer do Playwright usa `firebase emulators:exec` + `scripts/emulators-keepalive.cjs`.
Consequência: dev/build estáveis nesta máquina; quem clonar o repo fora do OneDrive não precisa da junction (documentado no README).

## ADR-018 — Criação numerada (estimates/invoices) exige conexão

**Data:** 2026-06-11 · **Fase:** 4
Contexto: SPEC §5 exige contadores transacionais em settings; transações do Firestore não funcionam offline — conflita com o offline-first (ADR-016).
Decisão: `nextDocumentNumber`/conversões usam `runTransaction` e falham offline com a mensagem i18n "offline"; edição, status e deleção desses docs seguem offline-first via commitWrite.
Consequência: números nunca duplicam; criar estimate/invoice no campo sem sinal não é suportado (caso raro — documento comercial se emite do escritório).

## ADR-019 — Job → Invoice fatura o valor do job em 1 line item

**Data:** 2026-06-11 · **Fase:** 4
Contexto: SPEC §5 diz "lineItems do job", ambíguo — copiar costs cobraria o cliente pelo CUSTO (perderia a margem).
Decisão: a invoice nasce com 1 line item {description: nome do job, qty 1, unitPrice: valueCents}; paidCents inicial = paidCents + depositCents do job; dueDate = +30 dias; só jobs `completed` sem invoiceId convertem.
Consequência: o cliente é cobrado pelo preço acordado. Mark Paid não retro-atualiza job.paymentStatus — rastreado para a Fase 6 (dashboard de unpaid usa invoices).

## ADR-020 — PDF via blob em nova aba, sem PDFViewer embutido

**Data:** 2026-06-11 · **Fase:** 4
Contexto: @react-pdf/renderer pesa ~500KB; PDFViewer embutido inflaria o First Load JS de todas as rotas comerciais (orçamento §10: <180KB na inicial).
Decisão: import dinâmico só no clique — preview = blob em nova aba; download = anchor com blob. Rota inicial segue em ~88KB.
Consequência: "preview do PDF" da §8 é atendido com o PDF real (não um mock HTML); sem custo de bundle para quem não usa.

## ADR-021 — Paywall global cobre todas as rotas do app, inclusive /billing

**Data:** 2026-06-11 · **Fase:** 5
Contexto: SPEC §6.2 — sem status ∈ {active, trialing} o app inteiro mostra o paywall; mas o usuário precisa de um caminho para assinar.
Decisão: o paywall (renderizado no layout do grupo `(app)`) É a tela de assinatura: contém o comparativo Solo×Pro com checkout e sign out. Preços não são exibidos na UI (vivem no Stripe) — aparecem no Checkout.
Consequência: zero rota "vazada"; o doc `subscriptions` que só o webhook escreve é a única chave do app. uid amarrado via `client_reference_id` + `subscription_data.metadata.uid` (fallback por `customers/`).

## ADR-022 — E2E simula o webhook concedendo trial via REST dos emulators

**Data:** 2026-06-11 · **Fase:** 5
Contexto: o paywall bloquearia todos os fluxos e2e; rodar Stripe real no Playwright local é frágil (o teste §10-e2e-5 com `stripe listen` fica para a Fase 7 com chaves reais).
Decisão: após o onboarding, o teste asserta o paywall e então grava `subscriptions/{uid}` via Firestore REST com `Bearer owner` (equivalente exato do Admin SDK do webhook); o app desbloqueia via onSnapshot.
Consequência: o e2e cobre o paywall e o desbloqueio em tempo real; a lógica do webhook em si tem 10 testes próprios contra o emulator (assinatura, 4 eventos, idempotência).

## ADR-023 — Definições das métricas do dashboard/analytics

**Data:** 2026-06-12 · **Fase:** 6
Contexto: a SPEC pede KPIs "com comparativo vs mês anterior" sem definir as bases de cálculo.
Decisão: Revenue = invoices pagas (paidAt na janela, totais derivados); comparativo = MTD vs o MESMO trecho do mês anterior; Margin MTD = (receita − materiais − labor dos jobs faturados) / receita; Unpaid = Σ balanceDue dos jobs `invoiced`; série de 12 meses: receita por paidAt × custos por job.date; Mark Paid passou a sincronizar o job (fecha ADR-019).
Consequência: tudo derivado dos docs existentes, sem agregados persistidos; testado em features/dashboard|analytics/utils.

## ADR-024 — Notificações derivadas na leitura, sem coleção própria

**Data:** 2026-06-12 · **Fase:** 6
Contexto: SPEC §5 lista 5 notificações in-app; nada exige persistência/estado lido-não-lido.
Decisão: `useNotifications` deriva a lista dos dados já carregados (jobs/inventory/estimates/invoices); expired/overdue continuam sendo auto-marcados na leitura pelas APIs.
Consequência: zero escrita extra e sempre consistente; "marcar como lida" seria feature nova (v3) com coleção própria.

## ADR-025 — Clock-in valida timer único com os dados do onSnapshot, e botão exige job

**Data:** 2026-06-12 · **Fase:** 6
Contexto: o guard do clock-in fazia `getDocs` que pendurava offline (regressão exposta pelo e2e quando o nº de listeners cresceu); e o clique antes do select carregar disparava erro.
Decisão: o guard usa os timers abertos já observados pela UI (zero rede, ADR-014 mantido); o botão Clock In fica desabilitado sem job selecionado.
Consequência: clock-in 100% offline-safe; o e2e crítico volta a ser determinístico.

## ADR-026 — Fila de fotos offline é best-effort em memória

**Data:** 2026-06-12 · **Fase:** 7
Contexto: SPEC §7 menciona foto "em fila local" no cenário offline; uploads do Storage não têm persistência offline nativa.
Decisão: fotos tiradas offline ficam numa fila em memória e sobem no evento `online`; não sobrevivem a reload offline (persistir blobs em IndexedDB é feature v3).
Consequência: cobre o caso comum (sinal oscilando no campo); o doc do job em si é 100% offline-safe.

## ADR-027 — E2E roda contra build de produção; SW nunca intercepta 127.0.0.1

**Data:** 2026-06-12 · **Fase:** 7
Contexto: o dev server (compilação on-demand) tornava a suite e2e flaky sob contenção; e o e2e em produção expôs um bug real — o service worker interceptava o webchannel do Firestore para os emulators (127.0.0.1), pendurando transações.
Decisão: Playwright webServer = `pnpm build && pnpm start`; SW ganhou `NetworkOnly` para `127.0.0.1`; CSP do middleware pula quando `NEXT_PUBLIC_USE_EMULATORS=true` (origens do emulator não passam no connect-src).
Consequência: 10/10 e2e em ~1,5min, estáveis; bug de PWA+emulator corrigido antes de produção.

## ADR-028 — Medição Lighthouse do /dashboard é o fluxo não-autenticado

**Data:** 2026-06-12 · **Fase:** 7
Contexto: §10 pede Lighthouse ≥90 em /dashboard, mas headless sem sessão mede skeleton → redirect a /login (LCP 5–7s domina; TBT ~0; alta variância 66–78).
Decisão: registrar as duas medições — `/` 96/100/96 (alvo batido) e `/dashboard` unauth 66–78/100/96 — e aplicar a melhoria estrutural (Recharts lazy: −29KB no First Load do dashboard). Medição autenticada fica manual (DevTools) no projeto real.
Consequência: número reportado é honesto; o caminho autenticado real não paga o custo do redirect medido.
