# Brevia

> AI Coaching Platform SaaS — turn every session transcript into structured notes, action items, and a brief for the next session.

[![CI](https://img.shields.io/badge/PRs-5%20%2B-green)](<>)
[![Stack](https://img.shields.io/badge/Next.js-15-black)](<>)
[![Stack](https://img.shields.io/badge/Supabase-Postgres-green)](<>)
[![Stack](https://img.shields.io/badge/Stripe-Billing-635bff)](<>)
[![Stack](https://img.shields.io/badge/Anthropic-Claude-d97757)](<>)

Brevia is a multi-tenant SaaS where coaching workspaces onboard coaches, run sessions with clients, and use AI to turn transcripts into structured notes — summaries, action items, and a brief for the next session. Subscription-billed with Stripe.

This repository is the full MVP: 4 stacked PRs of focused, demoable work.

---

## What's in the box

| Capability                                                   | Status |
| ------------------------------------------------------------ | ------ |
| Multi-tenant workspaces with RLS                             | ✅     |
| Owner / Coach / Client roles with invites                    | ✅     |
| Coach profiles + Client CRUD                                 | ✅     |
| Session booking + lifecycle (scheduled → completed/canceled) | ✅     |
| **AI session notes via Anthropic Claude (`tool_use`)**       | ✅     |
| Quota enforcement per plan (free 5 / pro 50 / team 500)      | ✅     |
| Stripe Billing (Checkout + Customer Portal + webhooks)       | ✅     |
| Idempotent webhook handling                                  | ✅     |
| 7-day trial on paid plans                                    | ✅     |
| Past-due block on AI generation                              | ✅     |
| 230 unit tests, strict TDD, all green                        | ✅     |
| `pnpm typecheck && pnpm lint && pnpm test` all clean         | ✅     |

---

## Tech stack

- **Frontend + Backend**: Next.js 15 (App Router) · React 19 · TypeScript strict
- **Database + Auth**: Supabase (Postgres + Auth + RLS + Edge Functions compatible)
- **Payments**: Stripe Billing (Checkout + Customer Portal + Webhooks)
- **AI**: Anthropic Claude (`claude-sonnet-4-5`) with `tool_use` for structured output
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit/integration, 230 tests) + Playwright (E2E smoke)
- **Quality**: ESLint · Prettier · `tsc --noEmit`

---

## Architecture

Clean Architecture / Hexagonal, layered in `src/`:

```
src/
├── domain/         ← Pure TypeScript. Entities, value objects, domain errors.
│   ├── entities/     Coach, Client, Session, Transcript, AINotes, Subscription, ...
│   ├── value-objects/  Money, Email, Slug, DateRange, Plan, ActionItem, branded ids
│   └── errors/       DomainError taxonomy
│
├── application/    ← Use cases + ports (interfaces). NO React, NO Supabase.
│   ├── ports/         All gateways and repositories as interfaces
│   ├── use-cases/     SignUp, InviteMember, BookSession, CreateTranscript, ...
│   └── lib/           Pure helpers (year-month, etc.)
│
├── infrastructure/ ← Adapters that implement the ports.
│   ├── supabase/      Repos, auth gateway, RLS-friendly client
│   ├── stripe/        Stripe SDK gateway
│   ├── ai/            Anthropic client (with tool_use) + stub fallback
│   ├── email/         Console email (dev) — swap for Resend in prod
│   └── auth/          Token hasher (Node crypto)
│
├── presentation/   ← Server actions + React components.
│   ├── actions/       Server actions per WU (auth, members, wu-2, wu-3, wu-4)
│   └── components/    Nav, forms, submit button
│
├── app/            ← Next.js App Router pages.
│   ├── (auth)/         sign-in, sign-up
│   ├── dashboard/
│   ├── coaches/  clients/  sessions/  sessions/[id]/
│   ├── settings/  members/  billing/
│   ├── billing/  success/
│   ├── accept-invitation/
│   └── api/  webhooks/  stripe/
│
└── shared/         ← Cross-cutting: DI container, zod schemas
    ├── di/            getUseCases() + getWebhookHandlers()
    └── zod-schemas/    Boundary validation
```

**Dependency rule**: `domain` ← `application` ← `infrastructure` ← `presentation`. Domain has zero external deps.

### Why this matters for a portfolio

1. **Testability**: Domain + application have 230 unit tests with **zero mocks of infrastructure**. Just plain in-memory fakes of the ports. You can run the full domain + application test suite in ~2 seconds with no DB, no network.
2. **Substitutability**: Swapping Stripe for LemonSqueezy is changing one file. Replacing Anthropic with OpenAI is changing one file. The use cases don't care.
3. **Reasoning locality**: When a bug appears, the use case test that exercises the bug tells you exactly which layer misbehaved.

---

## Skills demonstrated (Upwork-aligned)

| Skill                                                          | Where it lives                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Next.js 15 App Router + Server Components + Server Actions** | `src/app/`, `src/presentation/actions/`                                                   |
| **Supabase + Postgres + RLS**                                  | `supabase/migrations/`, `src/infrastructure/supabase/`                                    |
| **Stripe Billing (Checkout + Portal + Webhooks)**              | `src/infrastructure/stripe/`, `src/app/api/webhooks/stripe/`                              |
| **AI integration with structured output**                      | `src/infrastructure/ai/anthropic-ai-gateway.ts` (Anthropic `tool_use`)                    |
| **Clean Architecture / Hexagonal**                             | `src/domain`, `src/application`, `src/infrastructure`                                     |
| **Multi-tenant SaaS data modeling**                            | `companies` → `memberships` → `coaches`/`clients`/`sessions` → `transcripts` → `ai_notes` |
| **Strict TDD**                                                 | 230 tests, all written before or alongside the code they exercise                         |
| **Branded types / type-safe IDs**                              | `src/domain/value-objects/branded-id.ts` (UserId ≠ CompanyId at the type level)           |
| **Idempotency at the DB level**                                | `processed_webhook_events` table (PK dedupe)                                              |
| **Quota / entitlement enforcement**                            | Server-side in use case, before the LLM call (per spec)                                   |
| **Webhook signature verification + raw body**                  | `src/app/api/webhooks/stripe/route.ts`                                                    |
| **Defense in depth**                                           | RLS in DB + actor checks in use cases + visibility filters in repos                       |

---

## Project history (stacked PRs)

The MVP was built in 5 stacked PRs, each self-contained and demoable:

| PR                                                    | Title                                         | LOC       | Tests |
| ----------------------------------------------------- | --------------------------------------------- | --------- | ----- |
| [#1](https://github.com/sebasg2399/app-brevia/pull/1) | Foundations + auth + workspace + invitations  | 10,838    | 108   |
| [#2](https://github.com/sebasg2399/app-brevia/pull/2) | Coaches + clients + sessions                  | 3,675     | 54    |
| [#3](https://github.com/sebasg2399/app-brevia/pull/3) | Transcripts + AI notes (Anthropic `tool_use`) | 2,689     | 57    |
| [#4](https://github.com/sebasg2399/app-brevia/pull/4) | Stripe Billing + webhooks                     | 1,270     | 11    |
| [#5](https://github.com/sebasg2399/app-brevia/pull/5) | E2E + RLS tests + docs                        | (this PR) | +     |

Total: **~18k LOC**, **230 unit tests** (before E2E).

---

## Getting started

### Prerequisites

- Node.js 20+ (this repo was built on 20.19)
- pnpm 9+
- A Supabase project (free tier is fine) — [supabase.com](https://supabase.com)
- An Anthropic API key — [console.anthropic.com](https://console.anthropic.com)
- (Optional) Stripe test account — [dashboard.stripe.com](https://dashboard.stripe.com/test)

### 1. Install

```bash
git clone https://github.com/sebasg2399/app-brevia.git
cd app-brevia
pnpm install
cp .env.example .env.local
```

### 2. Configure `.env.local`

```env
# Supabase (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_TEAM=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the AI gateway uses a deterministic stub.
Without `STRIPE_SECRET_KEY` the billing page shows a clear "not configured" message and the checkout button throws a friendly error.

### 3. Apply the migrations

In the Supabase dashboard → SQL Editor, paste and run each file in `supabase/migrations/` in order:

```
0001_initial_schema.sql
0002_coaches_clients_sessions.sql
0003_transcripts_ai_subscriptions.sql
0004_subscription_trial_ends.sql
```

Or via the Supabase CLI:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

### 4. Run

```bash
pnpm dev
# http://localhost:3000
```

### 5. Stripe webhook (optional, for billing flow)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET in .env.local
```

Then trigger events locally:

```bash
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

---

## Development

### Commands

```bash
pnpm dev          # Next.js dev server
pnpm build        # Production build
pnpm start        # Run production build

pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
pnpm test         # Vitest unit + integration
pnpm test:watch   # Vitest watch mode
pnpm test:coverage  # Vitest with v8 coverage
pnpm test:e2e     # Playwright E2E
```

### Project conventions

- **File aliases** (`tsconfig.json` paths):
  - `@domain/*` → `src/domain/*`
  - `@app/*` → `src/application/*`
  - `@infra/*` → `src/infrastructure/*`
  - `@ui/*` → `src/presentation/*`
  - `@shared/*` → `src/shared/*`
- **Server actions**: `src/presentation/actions/<topic>.ts`, all `use server`, all redirect on success, all throw `ActionError` on failure
- **Server-only code**: imports `"server-only"` at the top to prevent accidental client-side imports
- **Branded IDs**: every entity has a `FooId` class; `UserId` and `CompanyId` are not interchangeable at the type level
- **Test fakes**: `tests/unit/application/__support__/fakes.ts` provides `InMemory*` and `Fake*` implementations of every port

### Adding a new use case

1. Define a port (or use an existing one) in `src/application/ports/`
2. Write the use case in `src/application/use-cases/<name>.ts` with explicit deps object
3. Write the test in `tests/unit/application/use-cases/<name>.test.ts` using fakes from `__support__/fakes.ts`
4. Wire the repo implementation in `src/infrastructure/<provider>/repos/`
5. Add the use case to the DI container in `src/shared/di/container.ts`
6. Call from a server action in `src/presentation/actions/`

---

## Deployment

The app is designed to deploy on Vercel + Supabase.

1. Push to GitHub (or connect your fork)
2. Import the repo in Vercel — it auto-detects Next.js
3. Set all the env vars from `.env.local` in the Vercel project settings
4. Add the Vercel deployment URL to your Supabase project's allowed redirect URLs (Auth → URL Configuration)
5. In Stripe dashboard → Webhooks, add an endpoint pointing to `https://your-app.vercel.app/api/webhooks/stripe` and copy the signing secret to Vercel env vars

The webhook handler is `runtime = 'nodejs'` because Stripe signature verification needs the raw request body.

---

## License

UNLICENSED — personal portfolio project. Use as inspiration, not as a starter.

---

## Acknowledgments

Built following the **Spec-Driven Development** workflow defined in `openspec/`. Every feature has a proposal, requirements, scenarios, design decisions, and a task breakdown before any code is written. See `openspec/changes/mvp-launch/` for the full MVP specification.
