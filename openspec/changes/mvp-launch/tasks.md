# Tasks: Brevia MVP

## Review Workload Forecast

| Field                   | Value                                 |
| ----------------------- | ------------------------------------- |
| Estimated changed lines | 2500–3500 (code + tests + migrations) |
| 400-line budget risk    | High                                  |
| Chained PRs recommended | Yes                                   |
| Delivery strategy       | ask-on-risk                           |
| Suggested split         | 5 stacked PRs to main                 |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units (stacked to main)

| Unit | Goal                                | Likely PR   |
| ---- | ----------------------------------- | ----------- |
| WU-1 | Foundations + Auth + Workspace      | PR 1 → main |
| WU-2 | Coaches + Clients + Sessions        | PR 2 → main |
| WU-3 | Transcripts + AI notes (Anthropic)  | PR 3 → main |
| WU-4 | Stripe Billing + Webhooks + Plan UI | PR 4 → main |
| WU-5 | E2E suite + README + demo polish    | PR 5 → main |

Each PR demoable in isolation. RLS policies land with WU-1; subsequent PRs only add tables + policies for new entities.

---

## Phase 1 — Foundations (WU-1)

- [ ] 1.1 `pnpm install` deps from package.json; verify lockfile
- [ ] 1.2 Create `src/{domain,application,infrastructure,presentation,shared}/` skeleton + barrel exports
- [ ] 1.3 Configure ESLint (next + import boundaries plugin), Prettier, tsconfig strict
- [ ] 1.4 Configure Vitest (jsdom env, alias paths) + Playwright (chromium)
- [ ] 1.5 Create `.env.local`, document required keys in `.env.example`
- [ ] 1.6 First Supabase project: schema `public`, run local `supabase start`

## Phase 2 — Domain Core (WU-1)

- [ ] 2.1 RED: `tests/unit/domain/entities/Company.test.ts` — invariants (slug unique, owner required)
- [ ] 2.2 GREEN: `src/domain/entities/Company.ts` with factory + `toJSON`
- [ ] 2.3 Same RED→GREEN cycle for `User`, `Membership`, `Invitation`
- [ ] 2.4 VOs: `Money` (cents), `Email` (regex), `Slug` (kebab), `DateRange`
- [ ] 2.5 Domain errors taxonomy in `src/domain/errors/index.ts`

## Phase 3 — Application + Infra for WU-1 (WU-1)

- [ ] 3.1 Define ports in `src/application/ports/`: `CompanyRepository`, `UserRepository`, `InvitationRepository`, `Clock`, `IdGenerator`
- [ ] 3.2 Use cases: `SignUp`, `SignIn`, `CreateWorkspace`, `InviteMember`, `AcceptInvitation`, `RemoveMember`
- [ ] 3.3 RED→GREEN for each use case (mocked ports)
- [ ] 3.4 Supabase repos implementing ports; tests against local Supabase
- [ ] 3.5 Supabase migrations: `companies`, `users_profile`, `memberships`, `invitations`, `processed_webhook_events`
- [ ] 3.6 RLS policies per table (deny-by-default, allow via membership JOIN)
- [ ] 3.7 Server Actions wrapping use cases; zod validation at boundary
- [ ] 3.8 Pages: `/sign-in`, `/sign-up`, `/onboarding`, `/settings/members`
- [ ] 3.9 E2E: owner signs up, creates workspace, invites coach, coach accepts

## Phase 4 — Coaches + Clients + Sessions (WU-2)

- [ ] 4.1 RED→GREEN: domain entities `Coach`, `Client`, `Session` + status state machine
- [ ] 4.2 Use cases: `CreateCoach`, `UpdateCoach`, `CreateClient`, `BookSession`, `CompleteSession`, `CancelSession`
- [ ] 4.3 Supabase migrations + RLS for `coaches`, `clients`, `sessions`
- [ ] 4.4 Repos + server actions + zod schemas
- [ ] 4.5 Pages: `/coaches`, `/clients`, `/sessions`, `/sessions/[id]`
- [ ] 4.6 Unit tests for status transitions (cancel-after-start rejected)

## Phase 5 — Transcripts + Anthropic (WU-3)

- [ ] 5.1 RED→GREEN: `Transcript` entity (immutable) + `AINotes` entity (with `status` enum)
- [ ] 5.2 Domain ports: `AIGateway`, `TranscriptRepository`, `AINotesRepository`
- [ ] 5.3 Anthropic adapter with tool_use schema for `{summary, actionItems, nextSessionBrief}`
- [ ] 5.4 Use case `CreateTranscript` (validate, persist, schedule notes)
- [ ] 5.5 Use case `GenerateAINotes` (quota check, AI call, retry 2x, persist, increment counter)
- [ ] 5.6 Use case `GetMonthlyUsage` (company-scoped counter)
- [ ] 5.7 Supabase migrations + RLS for `transcripts`, `ai_notes`, `quota_counters`
- [ ] 5.8 Server actions + pages: `/sessions/[id]/transcript`, `/sessions/[id]/notes`
- [ ] 5.9 Tests: quota exceeded blocks call; subscription past_due blocks call; retry logic
- [ ] 5.10 Smoke test: paste real transcript → notes appear in <10s

## Phase 6 — Stripe Billing + Webhooks (WU-4)

- [ ] 6.1 RED→GREEN: `Subscription` entity (status enum, plan enum)
- [ ] 6.2 Stripe adapter ports: `createCheckoutSession`, `createPortalSession`, `verifyWebhook`
- [ ] 6.3 Use cases: `StartCheckout`, `OpenCustomerPortal`, `HandleStripeWebhook` (idempotent)
- [ ] 6.4 Supabase migration: `subscriptions` table + RLS
- [ ] 6.5 Webhook handler at `app/api/webhooks/stripe/route.ts` (raw body, sig verify, dedupe by event.id)
- [ ] 6.6 Server actions + pages: `/settings/billing`, `/billing/success`, `/billing/cancel`
- [ ] 6.7 Tests: webhook idempotency; past_due → quota=0; trial → status=trialing
- [ ] 6.8 Stripe CLI smoke: trigger 4 event types, verify DB state

## Phase 7 — Hardening + E2E + Docs (WU-5)

- [ ] 7.1 Cross-tenant RLS tests (negative cases from auth spec)
- [ ] 7.2 Playwright E2E: full happy path from sign-up to AI notes
- [ ] 7.3 Coverage report (`pnpm test:coverage`) ≥ 80% on application/use-cases
- [ ] 7.4 README updated with demo GIF + tech rationale + Upwork-aligned skills map
- [ ] 7.5 Deploy to Vercel + Supabase (test mode); record demo video
- [ ] 7.6 Final pass: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` all green
