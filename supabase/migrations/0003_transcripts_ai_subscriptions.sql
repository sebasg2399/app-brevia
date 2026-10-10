-- Brevia MVP — transcripts, AI notes, subscriptions
-- Adds: transcripts, ai_notes, subscriptions tables + RLS policies

create type public.ai_notes_status as enum ('pending', 'ready', 'failed');
create type public.subscription_status as enum ('active', 'past_due', 'canceled', 'trialing');

-- =========================================================
-- SUBSCRIPTIONS
-- =========================================================

create table public.subscriptions (
  company_id uuid primary key references public.companies(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro', 'team')),
  status public.subscription_status not null default 'active',
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- TRANSCRIPTS
-- =========================================================

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  text text not null check (length(text) between 200 and 50000),
  created_at timestamptz not null default now(),
  unique (session_id)
);

create index idx_transcripts_company_id on public.transcripts(company_id);
create index idx_transcripts_session_id on public.transcripts(session_id);

-- =========================================================
-- AI NOTES
-- =========================================================

create table public.ai_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  status public.ai_notes_status not null default 'pending',
  summary text not null default '',
  action_items jsonb not null default '[]'::jsonb,
  next_session_brief text not null default '',
  model text,
  raw_response text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transcript_id)
);

create index idx_ai_notes_company_id on public.ai_notes(company_id);
create index idx_ai_notes_transcript_id on public.ai_notes(transcript_id);
create index idx_ai_notes_status on public.ai_notes(status) where status in ('pending', 'failed');

-- =========================================================
-- RLS
-- =========================================================

alter table public.subscriptions enable row level security;
alter table public.transcripts enable row level security;
alter table public.ai_notes enable row level security;

-- =========================================================
-- SUBSCRIPTIONS POLICIES
-- =========================================================

create policy "members can read subscription of their company"
  on public.subscriptions for select
  to authenticated
  using (company_id in (select public.current_company_ids()));

-- Only service role writes (webhooks in WU-4)

-- =========================================================
-- TRANSCRIPTS POLICIES
-- =========================================================

-- Read: owner, assigned coach (via coach.user_id = auth.uid), or assigned client
create policy "owner or assigned coach can read transcripts"
  on public.transcripts for select
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = transcripts.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    or exists (
      select 1 from public.sessions s
      join public.coaches c on c.id = s.coach_id
      where s.id = transcripts.session_id and c.user_id = auth.uid()
    )
  );

-- Only the assigned coach or the owner can insert
create policy "owner or assigned coach can insert transcript"
  on public.transcripts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = transcripts.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    or exists (
      select 1 from public.sessions s
      join public.coaches c on c.id = s.coach_id
      where s.id = transcripts.session_id and c.user_id = auth.uid()
    )
  );

-- Transcripts are immutable: no update / delete policy (only service role via DB)

-- =========================================================
-- AI NOTES POLICIES
-- =========================================================

create policy "owner or assigned coach can read ai notes"
  on public.ai_notes for select
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = ai_notes.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    or exists (
      select 1 from public.transcripts t
      join public.sessions s on s.id = t.session_id
      join public.coaches c on c.id = s.coach_id
      where t.id = ai_notes.transcript_id and c.user_id = auth.uid()
    )
  );

-- Writes are service-role only (the AI job runs server-side with service key)