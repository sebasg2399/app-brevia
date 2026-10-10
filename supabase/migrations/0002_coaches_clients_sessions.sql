-- Brevia MVP — coaches, clients, sessions
-- Adds: coaches, clients, sessions tables + RLS policies

create type public.session_status as enum ('scheduled', 'completed', 'canceled', 'archived');

-- =========================================================
-- COACHES
-- =========================================================

create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120),
  bio text not null default '' check (length(bio) <= 2000),
  focus_areas text[] not null check (array_length(focus_areas, 1) between 1 and 8),
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index idx_coaches_company_id on public.coaches(company_id);
create index idx_coaches_user_id on public.coaches(user_id);
create index idx_coaches_company_active on public.coaches(company_id) where is_active = true;

-- =========================================================
-- CLIENTS
-- =========================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  email text check (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  notes text check (notes is null or length(notes) <= 2000),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_company_id on public.clients(company_id);
create index idx_clients_company_active on public.clients(company_id) where deleted_at is null;

-- Enforce unique active email per company (partial unique index)
create unique index idx_clients_company_email_active
  on public.clients(company_id, email)
  where email is not null and deleted_at is null;

-- =========================================================
-- SESSIONS
-- =========================================================

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes in (15, 30, 45, 60, 90)),
  status public.session_status not null default 'scheduled',
  completed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sessions_company_id on public.sessions(company_id);
create index idx_sessions_coach_id on public.sessions(coach_id);
create index idx_sessions_client_id on public.sessions(client_id);
create index idx_sessions_status on public.sessions(status) where status = 'scheduled';

-- =========================================================
-- RLS
-- =========================================================

alter table public.coaches enable row level security;
alter table public.clients enable row level security;
alter table public.sessions enable row level security;

-- =========================================================
-- COACHES POLICIES
-- =========================================================

create policy "members can read coaches of their company"
  on public.coaches for select
  to authenticated
  using (company_id in (select public.current_company_ids()));

create policy "owners can insert coaches"
  on public.coaches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = coaches.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

create policy "owners or self can update coach"
  on public.coaches for update
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = coaches.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    or user_id = auth.uid()
  )
  with check (true);

create policy "owners can delete coaches"
  on public.coaches for delete
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = coaches.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- =========================================================
-- CLIENTS POLICIES
-- =========================================================

create policy "members can read clients of their company"
  on public.clients for select
  to authenticated
  using (company_id in (select public.current_company_ids()));

create policy "owners or coaches can insert clients"
  on public.clients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = clients.company_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'coach')
    )
  );

create policy "owners or coaches can update clients"
  on public.clients for update
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = clients.company_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'coach')
    )
  )
  with check (true);

create policy "owners can soft-delete clients"
  on public.clients for delete
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = clients.company_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- =========================================================
-- SESSIONS POLICIES
-- =========================================================

create policy "owner, assigned coach or client can read session"
  on public.sessions for select
  to authenticated
  using (
    -- owner of the company
    exists (
      select 1 from public.memberships m
      where m.company_id = sessions.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    -- assigned coach
    or exists (
      select 1 from public.coaches c
      where c.id = sessions.coach_id and c.user_id = auth.uid()
    )
    -- assigned client (via membership with role client)
    or exists (
      select 1 from public.memberships m
      join public.users_profile up on up.id = m.user_id
      where m.company_id = sessions.company_id
        and m.role = 'client'
        and up.id = auth.uid()
        and exists (
          select 1 from public.users_profile up2
          where up2.id = auth.uid()
        )
    )
  );

create policy "owner or assigned coach can insert session"
  on public.sessions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = sessions.company_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
    or exists (
      select 1 from public.coaches c
      where c.id = sessions.coach_id and c.user_id = auth.uid() and c.is_active = true
    )
  );

create policy "owner or assigned coach can update session"
  on public.sessions for update
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = sessions.company_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
    or exists (
      select 1 from public.coaches c
      where c.id = sessions.coach_id and c.user_id = auth.uid()
    )
  )
  with check (true);

create policy "owner can delete session"
  on public.sessions for delete
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = sessions.company_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );