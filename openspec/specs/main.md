spec_id: brevia-mvp
version: 0.1.0
status: active
last_updated: 2026-10-09

purpose: >
Brevia is an AI Coaching Platform SaaS where companies (workspaces) onboard coaches,
coaches run sessions with clients, and AI turns session transcripts into structured notes
(summary + action items + next-session brief). Subscription-based monetization.

scope:
in: - Multi-tenant companies (workspaces) with coaches and clients - Subscription billing via Stripe (Free, Pro, Team plans) - Coach profile management (bio, hourly rate, focus areas) - Client management per company - Session booking and transcript upload - AI-powered session notes generation (Anthropic Claude) - Plan-based AI usage quotas
out: - Stripe Connect / paying coaches directly (deferred) - Live video sessions (third-party integration deferred) - Mobile apps - Marketing site / SEO pages - Admin dashboard (out of scope for MVP; super-admin via SQL only)

personas:

- id: owner
  description: Workspace admin (founder / ops lead). Manages billing, invites coaches and clients.
- id: coach
  description: Practitioner using Brevia to run coaching sessions and access AI notes.
- id: client
  description: End customer who books sessions with a coach and views their session notes.

plans:

- id: free
  price_cents: 0
  ai_notes_per_month: 5
  seats: 2
- id: pro
  price_cents: 2900
  ai_notes_per_month: 50
  seats: 5
- id: team
  price_cents: 9900
  ai_notes_per_month: 500
  seats: 25

key_flows:

- subscription_lifecycle: trial → active → past_due → canceled
- ai_notes_generation: upload transcript → quota check → Claude call → structured output → persist
- company_onboarding: sign up → create company → choose plan → trial starts
