-- Brevia MVP — initial schema
-- Tables: companies, users_profile, memberships, invitations, processed_webhook_events
-- RLS: deny-by-default, allow via membership check

create extension if not exists "pgcrypto";

-- =========================================================
-- TABLES
-- =========================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 63),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_companies_owner_id on public.companies(owner_id);

-- =========================================================

create table public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(email) <= 254),
  full_name text check (full_name is null or (length(full_name) between 1 and 120)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_users_profile_email on public.users_profile(email);

-- =========================================================

create type public.membership_role as enum ('owner', 'coach', 'client');

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index idx_memberships_company_id on public.memberships(company_id);
create index idx_memberships_user_id on public.memberships(user_id);

-- =========================================================

create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  role public.membership_role not null check (role in ('coach', 'client')),
  invited_by uuid not null references public.users_profile(id) on delete restrict,
  token_hash text not null check (length(token_hash) >= 8),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.users_profile(id) on delete set null
);

create index idx_invitations_company_id on public.invitations(company_id);
create index idx_invitations_email on public.invitations(email);
create index idx_invitations_token_hash on public.invitations(token_hash);
create index idx_invitations_status on public.invitations(status) where status = 'pending';

-- =========================================================

create table public.processed_webhook_events (
  event_id text primary key,
  source text not null,
  processed_at timestamptz not null default now()
);

-- =========================================================
-- RLS — deny by default
-- =========================================================

alter table public.companies enable row level security;
alter table public.users_profile enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.processed_webhook_events enable row level security;

-- Helper: company IDs the current user belongs to
create or replace function public.current_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.memberships where user_id = auth.uid();
$$;

revoke all on function public.current_company_ids() from public;
grant execute on function public.current_company_ids() to authenticated;

-- =========================================================
-- POLICIES
-- =========================================================

-- companies: members can read their company; owner can update
create policy "members can read own company"
  on public.companies for select
  to authenticated
  using (id in (select public.current_company_ids()));

create policy "owners can update own company"
  on public.companies for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "users can create a company they own"
  on public.companies for insert
  to authenticated
  with check (owner_id = auth.uid());

-- =========================================================

-- users_profile: read own profile + profiles of members of same companies; insert/update self
create policy "users can read own profile"
  on public.users_profile for select
  to authenticated
  using (id = auth.uid());

create policy "users can read profiles of company members"
  on public.users_profile for select
  to authenticated
  using (
    exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.company_id = m2.company_id
      where m1.user_id = auth.uid() and m2.user_id = users_profile.id
    )
  );

create policy "users can insert own profile"
  on public.users_profile for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update own profile"
  on public.users_profile for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =========================================================

-- memberships: members can read their company roster; only owners can insert/update/delete
create policy "members can read memberships of their company"
  on public.memberships for select
  to authenticated
  using (company_id in (select public.current_company_ids()));

create policy "owners can insert memberships"
  on public.memberships for insert
  to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = memberships.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

create policy "owners can update memberships"
  on public.memberships for update
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = memberships.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  )
  with check (
    not (role = 'owner' and user_id <> (select owner_id from public.companies where id = memberships.company_id))
  );

create policy "owners can delete memberships"
  on public.memberships for delete
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = memberships.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    and not (user_id = (select owner_id from public.companies where id = memberships.company_id))
  );

-- =========================================================

-- invitations: owners manage; members can read invitations addressed to their email (pending)
create policy "owners can read invitations of their company"
  on public.invitations for select
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = invitations.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

create policy "owners can create invitations"
  on public.invitations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = invitations.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    and invited_by = auth.uid()
  );

create policy "owners can update invitations"
  on public.invitations for update
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = invitations.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  )
  with check (true);

create policy "owners can delete invitations"
  on public.invitations for delete
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = invitations.company_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- =========================================================

-- processed_webhook_events: only service role can touch
-- (no policies → only service role bypasses RLS)
