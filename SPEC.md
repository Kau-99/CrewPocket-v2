# CrewPocket v2 — Especificação Técnica Completa para Rebuild

> **Como usar:** este documento é a fonte de verdade — em caso de dúvida, ele prevalece sobre suposições. Execução fase por fase (seção 11).

---

# 1. MISSÃO

Reconstruir o **CrewPocket** — SaaS de gestão de field service para empreiteiros americanos (insulation, HVAC, construção leve) — como produto comercializável. A versão 1 era um PWA Vanilla JS monolítico (13.700 linhas em 1 arquivo) com paywall client-side burlável. A v2 deve ser: **segura por construção, tipada de ponta a ponta, testada, offline-first, mobile-first e com billing inviolável**.

**Persona primária:** dono de empresa de 1–5 funcionários, usa o celular no campo (sol, luvas, sinal ruim), inglês ou espanhol, precisa de orçamento → trabalho → horas → fatura sem fricção.

---

# 2. STACK (fixa — não substituir sem registrar em DECISIONS.md)

| Camada       | Tecnologia                                                                      | Versão mínima |
| ------------ | ------------------------------------------------------------------------------- | ------------- |
| Framework    | Next.js (App Router)                                                            | 14.2+         |
| Linguagem    | TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | 5.4+          |
| UI           | Tailwind CSS + shadcn/ui + lucide-react + sonner (toasts)                       | —             |
| Server state | TanStack Query                                                                  | v5            |
| Client state | Zustand (apenas UI: sidebar, modais, idioma, tema)                              | —             |
| Validação    | Zod (fonte única de tipos via `z.infer`)                                        | 3.23+         |
| Auth/dados   | Firebase Auth + Firestore (client SDK)                                          | v10 modular   |
| Privilegiado | firebase-admin **apenas** em API routes                                         | —             |
| Pagamentos   | Stripe Checkout + Webhooks + Customer Portal                                    | API 2024-06+  |
| Forms        | react-hook-form + @hookform/resolvers/zod                                       | —             |
| Gráficos     | Recharts                                                                        | —             |
| PDF          | @react-pdf/renderer                                                             | —             |
| Datas        | date-fns + date-fns-tz                                                          | —             |
| PWA          | Serwist                                                                         | —             |
| Env          | @t3-oss/env-nextjs (validação de env em build)                                  | —             |
| Testes       | Vitest + @testing-library/react + Playwright + @firebase/rules-unit-testing     | —             |
| Qualidade    | ESLint (typescript-eslint strict-type-checked) + Prettier + Husky + lint-staged | —             |
| CI           | GitHub Actions                                                                  | —             |

**Proibições absolutas (configurar como ESLint errors quando possível):**

- `any` sem `// eslint-disable` justificado
- `dangerouslySetInnerHTML`
- `alert()`, `confirm()`, `prompt()`
- `console.log` em produção (permitir `console.error/warn` via logger central)
- Imports de uma feature em outra feature
- Segredos com prefixo `NEXT_PUBLIC_`
- Escrita na coleção `subscriptions` por código client-side
- CDNs externas — todas as libs via npm

---

# 3. ARQUITETURA

## 3.1 Estrutura de pastas

```
src/
├── app/
│   ├── (marketing)/page.tsx              # landing pública com pricing
│   ├── (auth)/login | signup | reset-password/
│   ├── (app)/                            # layout autenticado
│   │   ├── dashboard/
│   │   ├── jobs/            jobs/[id]/   jobs/board/   # board = kanban
│   │   ├── clients/         clients/[id]/
│   │   ├── estimates/       estimates/[id]/
│   │   ├── invoices/        invoices/[id]/
│   │   ├── calendar/
│   │   ├── field/                        # modo campo mobile
│   │   ├── crew/
│   │   ├── inventory/
│   │   ├── pricebook/
│   │   ├── mileage/
│   │   ├── analytics/
│   │   ├── tools/attic-estimator/
│   │   ├── settings/                     # perfil, empresa, idioma, tema, invoice config
│   │   └── billing/                      # plano atual, portal, upgrade
│   ├── api/
│   │   ├── stripe/checkout/route.ts
│   │   ├── stripe/webhook/route.ts
│   │   ├── stripe/portal/route.ts
│   │   └── health/route.ts
│   ├── layout.tsx · manifest.ts · robots.ts
├── features/<dominio>/
│   ├── components/ · hooks/ · api.ts · schemas.ts · utils.ts · __tests__/
├── lib/
│   ├── firebase/client.ts · firebase/admin.ts
│   ├── stripe/client.ts (server-only) · stripe/plans.ts
│   ├── firestore/converter.ts · firestore/collections.ts
│   ├── logger.ts · errors.ts · utils.ts
├── components/ui/ (shadcn) · components/shared/
├── hooks/ (useAuth, useSubscription, useOnlineStatus, useEntitlements)
├── i18n/ (en.ts, es.ts, index.ts — tipado: chaves inferidas de en.ts)
└── styles/globals.css
```

## 3.2 Regras estruturais

1. **Features são ilhas.** Importam apenas de `lib/`, `hooks/`, `components/`. Cross-feature = hook em `hooks/` ou composição na página.
2. **Limites:** componente ≤ 200 linhas, arquivo ≤ 300, função ≤ 50. Estourou → extrair.
3. **Server Components por padrão.** `"use client"` só com interatividade real.
4. **Toda leitura do Firestore passa por converter com `schema.safeParse`.** Documento inválido → log estruturado + excluído da lista (nunca quebrar a UI inteira por 1 doc corrompido).
5. **Toda escrita passa por `schema.parse` antes do `setDoc`.**
6. **Datas:** armazenar como Firestore `Timestamp`; na borda do app converter para `Date`; exibir com `Intl`/date-fns no timezone do usuário (default `America/Chicago`, configurável em settings).
7. **Dinheiro: SEMPRE inteiro em centavos** (`valueCents: number`). Formatação com `Intl.NumberFormat('en-US', {style:'currency', currency:'USD'})` apenas na exibição. Proibido float em cálculo financeiro.

---

# 4. MODELO DE DADOS — Zod schemas completos

> Implementar **exatamente** estes schemas em `features/<x>/schemas.ts`. Campos comuns via `baseEntitySchema` que todos estendem:

```ts
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().min(1),
  createdAt: timestampSchema, // helper z.custom<Timestamp>
  updatedAt: timestampSchema,
  schemaVersion: z.literal(2),
});
```

## 4.1 Client

```ts
clientSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  email: z.string().email().max(120).or(z.literal("")),
  phone: z.string().max(30),
  address: z.string().max(300),
  city: z.string().max(100),
  state: z.string().max(2),
  zip: z.string().max(10),
  notes: z.string().max(2000),
  isArchived: z.boolean().default(false),
});
```

## 4.2 Job

```ts
jobStatusSchema = z.enum(["lead", "quoted", "draft", "active", "completed", "invoiced"]);
paymentStatusSchema = z.enum(["unpaid", "partial", "paid"]);
prioritySchema = z.enum(["low", "normal", "high"]);

costItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: z.enum(["material", "labor", "equipment", "subcontractor", "other"]),
  qty: z.number().min(0).max(1_000_000),
  unitCostCents: z.number().int().min(0).max(1_000_000_00),
});

jobSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(200),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().max(120), // denormalizado p/ listas sem join
  status: jobStatusSchema,
  priority: prioritySchema.default("normal"),
  paymentStatus: paymentStatusSchema.default("unpaid"),
  date: timestampSchema, // data agendada
  deadline: timestampSchema.nullable(),
  address: z.string().max(300),
  zip: z.string().max(10),
  description: z.string().max(2000),
  notes: z.string().max(2000),
  tags: z.array(z.string().max(30)).max(20),
  costs: z.array(costItemSchema).max(100),
  valueCents: z.number().int().min(0).max(10_000_000_00), // preço cobrado
  depositCents: z.number().int().min(0).default(0),
  paidCents: z.number().int().min(0).default(0),
  paidAt: timestampSchema.nullable(),
  photoUrls: z.array(z.string().url()).max(30),
  estimateId: z.string().uuid().nullable(), // origem, se convertido
  invoiceId: z.string().uuid().nullable(),
});
```

**Máquina de estados do Job (validar nas transições — UI e rules):**

```
lead → quoted → draft → active → completed → invoiced
  └────────────────┐ qualquer estado pode voltar 1 passo (correção)
lead/quoted podem ir direto para draft (cliente fechou sem proposta formal)
invoiced é terminal exceto → completed (estorno de fatura)
```

## 4.3 Estimate

```ts
estimateStatusSchema = z.enum(["draft","sent","accepted","declined","expired"]);
lineItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300),
  qty: z.number().min(0).max(1_000_000),
  unitPriceCents: z.number().int().min(0),
});
estimateSchema = baseEntitySchema.extend({
  number: z.string().max(20),               // "EST-0001", contador em settings
  clientId: z.string().uuid().nullable(),
  clientName: z.string().max(120),
  title: z.string().min(1).max(200),
  status: estimateStatusSchema,
  lineItems: z.array(lineItemSchema).min(1).max(100),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(30).default(0),
  notes: z.string().max(5000),
  validUntil: timestampSchema,
  sentAt / acceptedAt / declinedAt: timestampSchema.nullable(),
  convertedJobId: z.string().uuid().nullable(),
});
// totais NÃO são armazenados — sempre derivados (fonte única de verdade):
// subtotal = Σ(qty × unitPriceCents); afterDiscount = subtotal × (1 − discountPct/100)
// total = round(afterDiscount × (1 + taxPct/100))  — arredondar só no fim
```

## 4.4 Invoice

```ts
invoiceSchema = baseEntitySchema.extend({
  number: z.string().max(20), // prefixo + contador (settings: invoicePrefix, invoiceCounter)
  jobId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().max(120),
  lineItems: z.array(lineItemSchema).min(1),
  discountPct,
  taxPct,
  notes, // como estimate
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
  dueDate: timestampSchema,
  paidAt: timestampSchema.nullable(),
  paidCents: z.number().int().min(0).default(0),
});
```

## 4.5 CrewMember, TimeLog, Mileage, Inventory, PricebookItem

```ts
crewMemberSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  role: z.string().max(80),
  phone: z.string().max(30),
  email: z.string().email().or(z.literal("")),
  hourlyRateCents: z.number().int().min(0).max(1_000_00),
  certifications: z.string().max(500),
  status: z.enum(["active", "inactive"]),
});

timeLogSchema = baseEntitySchema.extend({
  jobId: z.string().uuid(),
  crewMemberId: z.string().uuid().nullable(), // null = o próprio dono
  crewName: z.string().max(120),
  clockIn: timestampSchema,
  clockOut: timestampSchema.nullable(), // null = timer rodando
  breakMinutes: z.number().int().min(0).max(480).default(0),
  note: z.string().max(500),
  gps: z.object({ lat: z.number(), lng: z.number(), accuracy: z.number() }).nullable(),
});
// REGRAS: hours = (clockOut − clockIn − break) / 3600000, max 24h por log;
// 1 timer aberto por crewMember (impedir clock-in duplo); clockOut > clockIn obrigatório.

mileageLogSchema = baseEntitySchema.extend({
  jobId: z.string().uuid().nullable(),
  date: timestampSchema,
  miles: z.number().min(0).max(1000),
  purpose: z.string().max(200),
  // dedução = miles × settings.mileageRateCents (default 67¢/mi — IRS 2024; editável)
});

inventoryItemSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(120),
  category: z.string().max(60),
  quantity: z.number().min(0).max(1_000_000),
  unit: z.string().max(20),
  unitCostCents: z.number().int().min(0),
  supplier: z.string().max(120),
  minStock: z.number().min(0).default(0), // quantity ≤ minStock → alerta
});

pricebookItemSchema = baseEntitySchema.extend({
  name,
  category,
  unit,
  unitPriceCents,
  unitCostCents,
  description: z.string().max(500),
});
```

## 4.6 Subscription (escrita: SOMENTE servidor)

```ts
subscriptionSchema = z.object({
  status: z.enum(["active", "trialing", "past_due", "canceled", "none"]),
  plan: z.enum(["solo", "pro"]),
  interval: z.enum(["monthly", "annual"]),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string(),
  currentPeriodEnd: timestampSchema,
  cancelAtPeriodEnd: z.boolean(),
  updatedAt: timestampSchema,
});
```

## 4.7 Settings (doc único `settings/{uid}`)

```ts
settingsSchema = z.object({
  companyName: z.string().max(120),
  companyAddress: z.string().max(300),
  companyPhone: z.string().max(30),
  companyEmail: z.string().email().or(z.literal("")),
  logoUrl: z.string().url().nullable(),
  language: z.enum(["en", "es"]).default("en"),
  theme: z.enum(["dark", "light", "system"]).default("dark"),
  timezone: z.string().default("America/Chicago"),
  invoicePrefix: z.string().max(10).default("INV-"),
  invoiceCounter: z.number().int().min(1).default(1),
  estimateCounter: z.number().int().min(1).default(1),
  defaultLaborRateCents: z.number().int().default(65_00),
  mileageRateCents: z.number().int().default(67),
  minMarginPct: z.number().min(0).max(100).default(20), // alerta de margem baixa
  taxPctDefault: z.number().min(0).max(30).default(0),
});
```

---

# 5. REGRAS DE NEGÓCIO (implementar em `features/*/utils.ts` com testes unitários)

```
jobTotalCostCents(job)   = Σ costs[i].qty × costs[i].unitCostCents
jobLaborCostCents(job, timeLogs, crew) = Σ horas(log) × hourlyRateCents(member)
jobRealCostCents         = jobTotalCostCents + jobLaborCostCents
jobMarginCents           = valueCents − jobRealCostCents
jobMarginPct             = valueCents > 0 ? jobMarginCents / valueCents × 100 : 0
balanceDueCents          = valueCents − paidCents − depositCents (mínimo 0)
```

**Attic Estimator** (tabela fixa, por 1.000 sqft):
| R-value | bags | horas |
|---|---|---|
| R-30 | 22 | 2.5 |
| R-38 | 35 | 3.5 |
| R-49 | 45 | 4.5 |
| R-60 | 56 | 5.5 |

```
bags  = ceil(sqft/1000 × bagsPerK)
labor = sqft/1000 × hrsPerK
materialCents = bags × bagCostCents (default 45_00, editável)
laborCents    = labor × laborRateCents (default settings)
total = materialCents + laborCents → botão "Create Estimate from this"
```

**Notificações in-app (sem push na v2):** central de notificações com:

- Job ativo com `marginPct < settings.minMarginPct`
- Inventory com `quantity ≤ minStock`
- Estimate `sent` com `validUntil < now` → auto-marcar `expired` (na leitura, não cron)
- Invoice `sent` com `dueDate < now` → auto-marcar `overdue` (na leitura)
- Job com `deadline` em ≤ 48h

**Conversões (transação Firestore, atômicas):**

- Estimate → Job: copia lineItems para costs (category "material"), `valueCents = total`, vincula `estimateId`/`convertedJobId`, estimate → `accepted`
- Job → Invoice: gera number do contador (incremento transacional em settings), lineItems do job, job → `invoiced`

---

# 6. SEGURANÇA — implementação obrigatória

## 6.1 Billing inviolável (Fase 5)

**Fluxo:**

1. Client → `POST /api/stripe/checkout` com `Authorization: Bearer <Firebase ID token>` + `{plan, interval}`
2. Route: `verifyIdToken` (Admin SDK) → busca/cria `stripeCustomerId` (salvar em `customers/{uid}` server-only) → cria Checkout Session com `client_reference_id = uid`, `subscription_data.trial_period_days = 14`, `success_url`/`cancel_url`
3. Webhook `POST /api/stripe/webhook`:
   - **Validar assinatura**: `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` — usar raw body (`req.text()`), nunca JSON parseado
   - **Idempotência**: gravar `processedEvents/{event.id}` em transação; se já existe, retornar 200 sem reprocessar

| Evento                          | Ação em `subscriptions/{uid}`                            |
| ------------------------------- | -------------------------------------------------------- |
| `checkout.session.completed`    | status do subscription object, plan/interval do price ID |
| `customer.subscription.updated` | sync status, plan, currentPeriodEnd, cancelAtPeriodEnd   |
| `customer.subscription.deleted` | `status: "canceled"`                                     |
| `invoice.payment_failed`        | `status: "past_due"`                                     |

4. Mapear price IDs em `lib/stripe/plans.ts` via env vars (`STRIPE_PRICE_SOLO_MONTHLY` etc.)
5. `POST /api/stripe/portal` → Customer Portal session (cancelar/trocar cartão/upgrade)
6. **Acesso cortesia**: script `scripts/grant-access.ts` (Admin SDK, roda localmente) — nunca whitelist no código

## 6.2 Entitlements (gating Solo vs Pro)

`useEntitlements()` deriva da subscription (tempo real via `onSnapshot`):

| Capability                                                                  | Solo      | Pro                |
| --------------------------------------------------------------------------- | --------- | ------------------ |
| jobs, clients, estimates, invoices, inventory, pricebook, mileage, calendar | ✓         | ✓                  |
| Time tracking                                                               | só o dono | até 5 crew members |
| Crew management                                                             | ✗         | ✓                  |
| Analytics avançado (P&L, payroll)                                           | ✗         | ✓                  |
| Export CSV/backup                                                           | ✗         | ✓                  |

UI: feature bloqueada renderiza com `<UpgradeGate>` (blur + CTA), nunca esconder silenciosamente. **Importante:** gating client-side é UX; a garantia real é que sem `status ∈ {active, trialing}` o app inteiro mostra o paywall (verificado contra o doc `subscriptions` que só o servidor escreve).

## 6.3 Firestore Rules

```
subscriptions/{uid}:  read: auth.uid == uid;  write: false  (só Admin SDK)
customers/{uid}:      read, write: false                    (só Admin SDK)
processedEvents/**:   read, write: false
settings/{uid}:       read, write: auth.uid == uid + validação de campos
demais coleções:      owner-only (resource.data.ownerId == auth.uid em read/update/delete;
                      request.resource.data.ownerId == auth.uid em create)
```

**Em todo update:** `request.resource.data.ownerId == resource.data.ownerId && request.resource.data.createdAt == resource.data.createdAt` (imutáveis).
**Validações espelhando os Zod schemas:** enums de status, limites de string, ranges numéricos, `hours` ≤ 24.
**Fallback:** `match /{document=**} { allow read, write: if false; }`

**Testes obrigatórios com `@firebase/rules-unit-testing`:**

- user B não lê/escreve docs de user A (todas as coleções)
- client não escreve em `subscriptions` (nem o próprio dono)
- update não consegue alterar `ownerId`/`createdAt`
- enum inválido / string acima do limite / número fora do range → rejeitado

## 6.4 Storage Rules

```
/users/{uid}/jobs/{jobId}/{file}:
  read, write: auth.uid == uid
  write: size < 5MB && contentType.matches('image/(jpeg|png|webp)')
```

Upload: comprimir client-side para WebP máx 1600px antes de subir.

## 6.5 Demais

- **Auth:** `signInWithPopup` (Google) — nunca redirect (quebra em Safari/ITP); email+senha com `sendEmailVerification`; reset de senha; deletar conta (com confirmação digitada) apagando dados via API route + Admin SDK batch
- **App Check** reCAPTCHA v3 para Firestore/Auth/Storage; debug token via env só em dev
- **Headers (next.config):** CSP sem `unsafe-inline` para scripts (usar nonce do Next), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self)`
- **Rate limiting** nas API routes do Stripe (por uid, in-memory + verificação de janela; suficiente para Vercel)
- **Logger central** (`lib/logger.ts`): níveis, contexto `{uid, route}`, nunca logar tokens/PII

---

# 7. OFFLINE-FIRST (requisito de produto)

- Firestore `initializeFirestore` com `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`
- Serwist: precache do shell; `NetworkOnly` para `*.googleapis.com` (Firebase gerencia o próprio offline — **não interceptar**, lição do v1); `CacheFirst` para fonts/imagens estáticas
- TanStack Query: `networkMode: 'offlineFirst'`
- **Cenário crítico que DEVE funcionar:** sem sinal → clock-in → adicionar custo num job → tirar foto (fica em fila local) → clock-out → voltar sinal → tudo sincroniza sem perda. Cobrir com teste E2E usando `context.setOffline(true)` no Playwright
- UI: badge "Offline — changes will sync" no header; indicador de writes pendentes (`SnapshotMetadata.hasPendingWrites`)
- Página `/field` instalável e funcional 100% offline

---

# 8. ESPECIFICAÇÃO DAS TELAS

**Padrões globais:** toda lista tem busca (debounce 300ms), filtros, sort, skeleton loader, empty state com CTA e ilustração, paginação por cursor (Firestore `startAfter`, páginas de 25). Toda mutação: optimistic update + toast com Undo (5s) quando for delete. Delete = soft quando possível (`isArchived`), confirm dialog para hard delete. Atalhos: `⌘K` command palette (buscar/navegar/criar), `n` = novo na lista atual.

- **Dashboard:** 4 KPI cards (Active Jobs, Revenue MTD, Margin MTD %, Unpaid balance) com comparativo vs mês anterior; gráfico receita×custos (12 meses, Recharts); lista 5 jobs recentes; notificações; quick actions (New Job, New Estimate, Clock In)
- **Jobs (lista):** tabela responsiva (cards no mobile) com status badge colorido, cliente, data, valor, margem % (vermelho se < minMargin); filtro por status/tag/cliente; **/jobs/board:** kanban drag-and-drop entre status (dnd-kit), respeitando a máquina de estados
- **Job detail:** header com status stepper clicável; tabs: Overview (custos com inline edit, resumo financeiro: value, costs, labor, margin, balance due), Time (logs + timer ativo), Photos (grid, upload, lightbox), Invoice/Estimate vinculados; FAB mobile: Clock In neste job
- **Estimates/Invoices detail:** editor de line items (add/remove/reorder), totais ao vivo, preview do PDF, ações Send (marca sent + abre mailto com PDF anexável), Download PDF, Convert to Job / Mark Paid
- **PDF (estimate e invoice):** logo + dados da empresa (settings), número, cliente, tabela de itens, subtotal/desconto/tax/total, notas, validade/vencimento — layout limpo A4/Letter
- **Field (`/field`):** mobile-only por design; job ativo no topo; botão Clock In/Out gigante (min 64px, alvo de toque generoso — usuário de luvas); timer ao vivo; GPS capturado com permissão (falha silenciosa se negado); últimos logs; adicionar custo rápido (nome+qty+custo em 1 tela)
- **Calendar:** mês/semana; jobs por `date`; deadlines destacados; clicar dia → criar job na data
- **Clients detail:** dados + jobs do cliente + lifetime value + estimates/invoices vinculados
- **Analytics:** P&L por período (receita − materiais − labor = lucro), tabela de margem por job, receita por tag/categoria, payroll por crew member (Pro), tax summary anual (receita, despesas dedutíveis, milhas × rate) com export CSV (Pro)
- **Settings:** empresa (dados do PDF, upload de logo), preferências (idioma/tema/timezone), invoice config (prefixo/contadores/tax default), rates (labor, mileage, minMargin), conta (e-mail, senha, deletar conta)
- **Billing:** plano atual, status, próximo ciclo, botão Manage (portal), comparativo Solo×Pro com upgrade

**Responsividade:** mobile-first, breakpoints 360/768/1024/1440. Sidebar → bottom tab bar no mobile (Dashboard, Jobs, Field, More). Testar tudo a 360px. Dark default (`#0b0f17` fundo, `#3b9eff` primary), light via next-themes.

**A11y:** AA de contraste, navegação por teclado completa, focus visible, `aria-label` em ícones, `prefers-reduced-motion` respeitado.

**i18n:** dicionário tipado (chaves inferidas de `en.ts` — chave faltando em `es.ts` = erro de compilação). Formatação de moeda/data sempre via `Intl`, nunca string manual.

---

# 9. TRATAMENTO DE ERROS

- `lib/errors.ts`: `AppError` com `code` tipado (`"auth/expired"`, `"firestore/permission-denied"`, `"stripe/checkout-failed"`, `"offline"`, `"validation"`) + mapa código → mensagem i18n amigável
- Error boundary por rota (`error.tsx`) com retry; `global-error.tsx` de fallback
- Mutations: erro → toast com mensagem mapeada + rollback do optimistic update
- `permission-denied` do Firestore → verificar sessão; se expirada, redirect a login com `returnTo`
- Webhook: erro de processamento → log + HTTP 500 (Stripe re-tenta); assinatura inválida → 400 sem log de payload

---

# 10. CRITÉRIOS DE ACEITE (verificar TODOS antes de declarar concluído)

- [ ] `pnpm typecheck` zero erros · `pnpm lint` zero warnings
- [ ] Unit (Vitest): todos os schemas (válido + inválido por campo), todas as fórmulas da seção 5 (incluindo arredondamento de centavos e edge cases: qty 0, value 0, desconto 100%), attic estimator contra a tabela, máquina de estados do job. Cobertura ≥ 85% em `features/*/utils.ts` e `schemas.ts`
- [ ] Rules tests: matriz completa da seção 6.3 passando no emulator
- [ ] Webhook tests: 4 eventos da tabela + assinatura inválida (400) + evento duplicado (idempotente)
- [ ] Playwright E2E: (1) signup→onboarding→criar client→criar job→editar custos→margem correta; (2) clock in→out→horas no job; (3) estimate→PDF→convert to job; (4) job→invoice→mark paid; (5) checkout Stripe test mode→webhook via `stripe listen`→app desbloqueado; (6) fluxo offline da seção 7
- [ ] Lighthouse mobile (rota /dashboard, build de produção): Performance ≥ 90, A11y ≥ 95, Best Practices ≥ 95, PWA installable
- [ ] First Load JS da rota inicial < 180 KB gzipped (verificar com `next build`)
- [ ] Zero requests a CDNs externas em produção (verificar na aba Network)
- [ ] `README.md`: setup Firebase (projeto, App Check, emulators), Stripe (produtos, prices, `stripe listen`), env vars, deploy Vercel, comandos
- [ ] `scripts/migrate-v1.ts`: lê coleções do projeto v1, converte (dólares float → centavos int, millis → Timestamp, status capitalizado → lowercase, costs com `total` → derivado), valida com schemas v2, `--dry-run` default com relatório de docs inválidos
- [ ] `DECISIONS.md` com todas as decisões não-triviais (formato ADR de 5 linhas)

---

# 11. FASES DE EXECUÇÃO

> Antes de cada fase: plano em ≤ 8 bullets. Depois: executar, rodar `typecheck + lint + test`, corrigir, commitar (`feat(fase-N): ...`). Não avançar com a suite quebrada.

**Fase 0 — Fundação:** scaffold completo da stack, estrutura de pastas com placeholders, env validation, ESLint rules customizadas (proibições da seção 2), Husky, CI (lint→typecheck→test→build), Firebase emulators configurados (`firebase.json`), shadcn/ui inicializado com tema dark.

**Fase 1 — Auth & Shell:** Firebase client/admin, App Check, telas de auth, layout autenticado (sidebar desktop + bottom tabs mobile), `useAuth`, route guards, i18n tipado, settings doc criado no primeiro login, onboarding mínimo (nome da empresa).

**Fase 2 — Núcleo:** todos os Zod schemas (seção 4), converter genérico, Firestore Rules + testes, CRUD completo de Clients e Jobs (lista, detalhe, form, kanban, máquina de estados), fórmulas da seção 5 com testes.

**Fase 3 — Campo:** TimeLog (clock in/out, timer único por membro, GPS), página `/field`, Crew CRUD, Mileage, validação offline do fluxo crítico.

**Fase 4 — Comercial:** Estimates + Invoices (CRUD, line items, contadores transacionais, PDF, conversões atômicas), Pricebook, Inventory com alertas, Attic Estimator → Estimate.

**Fase 5 — Billing:** seção 6.1 e 6.2 completas, testada com Stripe CLI. **Não improvisar nada nesta fase — seguir a especificação literalmente.**

**Fase 6 — Dashboard, Analytics, PWA:** KPIs, gráficos, P&L, tax summary, notificações in-app, Serwist, manifest, indicadores offline.

**Fase 7 — Entrega:** E2E completo, Lighthouse, migração v1, polish de a11y/responsividade a 360px, README, auditoria final dos critérios da seção 10 item por item.

---

# 12. COMPORTAMENTO DO AGENTE

- Este documento é o contrato. Ambiguidade → opção mais simples que satisfaça os requisitos + registro em `DECISIONS.md`.
- Nunca pular testes "para ganhar tempo". Teste faz parte da definição de pronto.
- Nunca usar dados mock onde dados reais do Firestore emulator funcionam.
- Não adicionar features fora do escopo (push notifications, multi-tenancy, white-label) — anotar como "v3 ideas" em `DECISIONS.md` se surgir a tentação.
- Ao final de cada fase, imprimir checklist da fase com ✓/✗ e o que ficou pendente.
