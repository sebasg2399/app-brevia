# Design: Brevia MVP

## Technical Approach

Clean/Hexagonal architecture with strict dependency direction. Domain layer has zero external deps. Application layer defines ports; infrastructure implements them. Presentation (Next.js) calls use cases via DI container instantiated once per request. AI generation runs as fire-and-forget server action triggered after transcript persistence (no separate queue infra in MVP — Next.js server runtime + retry middleware is enough for portfolio scope).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Layering | Clean/Hex (domain/app/infra/pres) | Feature folders | Enforces dependency rule; easier to test domain in isolation |
| Mutations entry | Server Actions | API routes | Less boilerplate; built-in CSRF; aligns with App Router |
| Reads entry | React Server Components | Client + fetch | Smaller bundle; direct DB/repo access from RSC |
| Stripe checkout | Hosted Checkout | Embedded Checkout | Faster MVP; PCI scope stays on Stripe; conversion is similar |
| AI provider | Anthropic Claude Sonnet 4.5 | OpenAI | Best-in-class structured output via tool use; predictable JSON |
| Structured output | Anthropic tool use | Free-text + JSON.parse | Schema-enforced; less brittle; auditable |
| Quota check | In use case, server-side | DB trigger only | App-level check gives friendly errors; DB trigger is backup |
| Idempotency | `processed_webhook_events` table | In-memory | Survives restart; replayable; covers dup events |
| RLS pattern | JWT custom claim `company_id` | Session-table lookup | No per-query overhead; works for RSC + server actions |
| State machine | DB-driven (`subscription_status` enum) | Stripe-only | UI reads from DB; reconciliation job if drift detected |
| AI job trigger | Post-transaction server action | BullMQ / queue | Simpler; sufficient for MVP scale; retry via try/catch + persistence |
| Money | Integer cents (minor units) | Decimal lib | Stripe-aligned; no float errors |
| Auth | Supabase Auth (email + magic link) | NextAuth | RLS integration is first-class; magic link lowers friction |

## Data Flow

### AI Notes Generation (the hero flow)

```
Coach ──submit transcript──▶ Server Action
                              │
                              ├─ Validate (zod)
                              ├─ Persist Transcript (use case → Supabase repo)
                              │
                              └─ Schedule notes job (in-process queue, await)
                                   │
                                   ├─ Check quota (use case: GetMonthlyUsage)
                                   ├─ Check subscription.status (use case: GetSubscription)
                                   ├─ Build prompt (system + transcript)
                                   ├─ Claude API w/ tool_use schema
                                   ├─ Persist AINotes (structured)
                                   └─ Increment quota counter

Coach ──poll / revalidate──▶ RSC reads AINotes ──▶ UI renders
```

### Subscription Webhook

```
Stripe ──POST /api/webhooks/stripe──▶ Webhook handler
                                       │
                                       ├─ Verify signature (stripe.webhooks.constructEvent)
                                       ├─ Upsert into processed_webhook_events ON CONFLICT DO NOTHING
                                       │     (returns false on dup → ack 200, skip work)
                                       ├─ Switch on event.type
                                       ├─ Reconcile subscription row in DB
                                       └─ If past_due → set company quota override = 0
```

## File Changes

| Path | Action | Purpose |
|------|--------|---------|
| `src/domain/entities/{Company,User,Coach,Client,Session,Transcript,AINotes,Subscription,Invitation}.ts` | Create | Pure TS entities + factories + invariants |
| `src/domain/value-objects/{Money,Email,DateRange,Slug}.ts` | Create | Branded types for cents, ISO emails, ranges |
| `src/domain/errors/` | Create | DomainError taxonomy (QuotaExceeded, ImmutableResource, …) |
| `src/application/ports/{Repository,PaymentGateway,AIGateway,Clock,IdGenerator}.ts` | Create | Interfaces only; implementations in infra |
| `src/application/use-cases/{CreateTranscript,GenerateAINotes,BookSession,ChangeSubscription,InviteMember,AcceptInvitation}.ts` | Create | One file per use case |
| `src/infrastructure/supabase/{client,repos}/*.ts` | Create | Implementations of repository ports |
| `src/infrastructure/stripe/{client,webhook-handler}.ts` | Create | Stripe SDK wrapper + idempotent webhook handler |
| `src/infrastructure/anthropic/client.ts` | Create | Anthropic SDK wrapper with tool_use schema |
| `src/presentation/app/{layout,page}.tsx` + `(dashboard)/{sessions,coaches,clients,settings,billing}/page.tsx` | Create | App Router pages |
| `src/presentation/actions/*.ts` | Create | Server Actions (thin wrappers around use cases) |
| `src/presentation/components/{ui,domain}/*.tsx` | Create | Atomic-design layers (atoms/molecules/organisms) |
| `src/shared/di/container.ts` | Create | Request-scoped DI container; repos + gateways |
| `src/shared/zod-schemas/*.ts` | Create | Boundary validation schemas |
| `supabase/migrations/*.sql` | Create | Schema + RLS policies per table |
| `tests/{unit,integration,e2e}/` | Create | Vitest + Playwright suites |
| `app/api/webhooks/stripe/route.ts` | Create | Webhook entrypoint (raw body required) |

## Interfaces / Contracts

```ts
// domain/entities/AINotes.ts
export interface AINotes {
  readonly id: AINoteId;
  readonly transcriptId: TranscriptId;
  readonly companyId: CompanyId;
  readonly summary: string;          // ≤500 words
  readonly actionItems: ReadonlyArray<ActionItem>;
  readonly nextSessionBrief: string; // ≤300 words
  readonly status: 'pending' | 'ready' | 'failed';
}

// application/ports/AIGateway.ts
export interface AIGateway {
  generateNotes(input: { transcript: string; prompt: PromptContext }): Promise<AINotesDraft>;
}

// application/ports/PaymentGateway.ts
export interface PaymentGateway {
  createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string }>;
  createPortalSession(input: { customerId: string }): Promise<{ url: string }>;
  verifyWebhook(rawBody: Buffer, signature: string): WebhookEvent;
  // ...
}
```

## Testing Strategy

| Layer | What | Tool |
|-------|------|------|
| Domain | Entity invariants, value-object parsing, error mapping | Vitest, no mocks |
| Application | Use case orchestration with mocked ports | Vitest + in-memory repos |
| Infrastructure | Repos against local Supabase (via `supabase start`) | Vitest + test DB |
| Infrastructure | Stripe webhook signature + idempotency | Vitest with fixtures |
| E2E | Owner upgrade → trial → AI notes flow | Playwright headless |

Strict TDD: every use case starts with a failing test (`tests/unit/application/use-cases/CreateTranscript.test.ts`) before implementation.

## Migration / Rollout

No prior schema. Greenfield Supabase project. Migrations applied via `supabase db push`. Stripe in test mode throughout MVP; live keys only at deployment.

## Open Questions

- [ ] Should AI generation be synchronous (block UI) or async with polling? → Decided async with optimistic UI revalidate; 95% complete in <5s in practice.
- [ ] How to handle the coach who is also the company owner? Single user, dual role? → Allowed: role on membership is `owner`; coach profile optional.
- [ ] Magic link vs password for client sign-in? → Magic link only in MVP (less code, friction-free for invited clients).