# Proposal: Brevia MVP — Foundation + Core Flows

## Intent

Brevia is an AI Coaching Platform SaaS portfolio piece. Founders/operators (owners) create a workspace, onboard coaches, run sessions with clients, and let AI turn transcripts into structured notes (summary + action items + next-session brief). Monetization via Stripe subscriptions with 7-day trial.

This change builds the MVP end-to-end: company/coach/client model + subscriptions + AI notes. Portfolio target: demonstrate Next.js + Supabase + Stripe + Anthropic integration in production-shape code.

## Scope

### In Scope

- Multi-tenant workspace model (company owns coaches, clients belong to a company)
- Supabase Auth (email/password + magic link) with roles: owner, coach, client
- RLS policies on all tables scoped by company_id
- Stripe Billing with Free / Pro / Team plans, 7-day trial, webhooks
- Coach profile CRUD (bio, focus areas, hourly rate)
- Client CRUD per company
- Session booking (date/time/duration) + transcript upload (paste text)
- Anthropic Claude integration: transcript → {summary, actionItems[], nextSessionBrief}
- Plan-based AI quota enforcement
- Subscription state UI (current plan, usage, upgrade CTA)

### Out of Scope (deferred)

- Stripe Connect (paying coaches directly)
- Live video / WebRTC
- Mobile apps
- Marketing / public landing pages
- Admin super-dashboard
- Calendar sync (Google/Outlook)
- Multi-language AI output

## Capabilities

### New Capabilities

- `auth-and-rbac`: Supabase auth + role-based access + RLS baseline
- `company-management`: workspace CRUD + member invitations
- `coach-profiles`: coach profile management
- `client-management`: client CRUD scoped to company
- `session-booking`: session lifecycle (scheduled → completed → archived)
- `transcript-handling`: paste/upload + persist transcripts
- `ai-notes-generation`: Anthropic integration, structured output, quota enforcement
- `subscription-billing`: Stripe Billing plans + trial + webhooks + state machine

### Modified Capabilities

None — greenfield project.

## Approach

Clean Architecture / Hexagonal layered in `src/`:

- `domain/` — entities (Company, Coach, Client, Session, Transcript, AINotes, Subscription) + value objects + domain events. Zero external deps.
- `application/` — use cases (BookSession, GenerateNotes, SubscribeWorkspace) + ports (interfaces).
- `infrastructure/` — Supabase repos, Stripe adapter, Anthropic adapter implementing ports.
- `presentation/` — Next.js App Router pages + server actions + React components.

Presentation calls application use cases via DI; use cases call infrastructure through ports. Tests at every layer.

## Affected Areas

| Area                   | Impact   | Description                            |
| ---------------------- | -------- | -------------------------------------- |
| `src/domain/`          | New      | Pure entities + VOs + domain events    |
| `src/application/`     | New      | Use cases + ports                      |
| `src/infrastructure/`  | New      | Supabase + Stripe + Anthropic adapters |
| `src/presentation/`    | New      | App Router pages + server actions      |
| `supabase/migrations/` | New      | SQL migrations + RLS policies          |
| `openspec/`            | Modified | Specs, design, tasks                   |

## Risks

| Risk                                                   | Likelihood | Mitigation                                                    |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------- |
| RLS misconfiguration leaks data across tenants         | Med        | RLS tests in CI; deny-by-default; explicit policies per table |
| Stripe webhook drops events → wrong subscription state | Med        | Idempotency by event.id; reconcile job on boot                |
| AI quota bypass via direct API calls                   | Med        | Quota enforced server-side in use case; client only displays  |
| Anthropic rate limits during demo                      | Low        | Fallback message + retry with jitter                          |

## Rollback Plan

DB: every migration includes a down script. App: feature flags on AI generation (`AI_NOTES_ENABLED=true`). Stripe: switch back to free plan via customer portal. Code: revert merge commit.

## Success Criteria

- [ ] Owner can sign up, create company, invite coach and client, choose plan, complete trial checkout
- [ ] Coach can create profile, book session, paste transcript, receive AI notes within 5s
- [ ] AI notes contain summary + ≥1 action item + next-session brief
- [ ] Subscription webhook flips status correctly (created, updated, canceled, payment_failed)
- [ ] Quota blocks AI after plan limit; UI shows remaining count
- [ ] All tests pass: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`
- [ ] RLS tests verify coach A in company X cannot read data from company Y
