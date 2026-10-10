# Brevia

AI Coaching Platform SaaS — coaches publish profiles, clients book sessions, AI turns transcripts into structured notes and next-session briefs.

## Stack

- **Frontend & Backend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Database & Auth**: Supabase (Postgres + RLS + Auth + Edge Functions)
- **Payments**: Stripe Billing (subscriptions with trial + webhooks)
- **AI**: Anthropic Claude API (session notes generation)
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Quality**: ESLint + Prettier + TypeScript strict mode

## Architecture

Clean Architecture / Hexagonal, layered in `src/`:

```
src/
├── domain/          ← Pure entities, value objects, domain events, domain errors
├── application/     ← Use cases (interactors) + ports (interfaces)
├── infrastructure/  ← Adapters: Supabase repos, Stripe client, Anthropic client
└── presentation/    ← Server Actions, React components, hooks
```

Dependency rule: domain ← application ← infrastructure ← presentation.
Domain has ZERO deps on outer layers. Application defines ports; infrastructure implements them.

## Status

🚧 MVP under construction via SDD (Spec-Driven Development). See `openspec/`.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```