-- Brevia RLS cross-tenant tests
-- Run via: psql $DATABASE_URL -f supabase/tests/rls_cross_tenant.sql
-- Or via: supabase test db (pgTAP-style harness)
--
-- These tests assert that RLS actually prevents cross-tenant reads/writes.
-- They run as the `authenticated` role to exercise the policies as a real user
-- would, with JWT claims set via `set_config('request.jwt.claims', ...)`.

-- =========================================================
-- Test setup: two companies, one user in each
-- =========================================================

begin;
select plan(15);  -- pgTAP; if you don't have pgTAP, run the asserts manually

-- Helper to set the acting user
create or replace function tests.as_user(uid uuid, claims jsonb)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', uid::text, true);
end;
$$;

create or replace function tests.reset_role()
returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', null, true);
  perform set_config('request.jwt.claim.sub', null, true);
end;
$$;

-- Two users
select tests.reset_role();
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@a.com'),
  ('22222222-2222-4222-8222-222222222222', 'bob@b.com')
on conflict (id) do nothing;

insert into public.users_profile (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@a.com'),
  ('22222222-2222-4222-8222-222222222222', 'bob@b.com')
on conflict (id) do nothing;

-- Two companies owned by each
insert into public.companies (id, name, slug, owner_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alice Co', 'alice-co', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bob Co', 'bob-co', '22222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;

insert into public.memberships (id, company_id, user_id, role) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner')
on conflict (id) do nothing;

insert into public.subscriptions (company_id, plan, status) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'free', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'free', 'active')
on conflict (company_id) do nothing;

-- =========================================================
-- Tests
-- =========================================================

-- 1. A user in company A cannot read company B
select tests.as_user('11111111-1111-4111-8111-111111111111', '{}'::jsonb);
select is(
  (select count(*) from public.companies where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'User in company A cannot read company B'
);

-- 2. A user can read their own company
select is(
  (select count(*) from public.companies where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1::bigint,
  'User can read their own company'
);

-- 3. A user cannot create a company they don't own
select lives_ok(
  $$ insert into public.companies (id, name, slug, owner_id)
     values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Hack', 'hack', '22222222-2222-4222-8222-222222222222') $$,
  'Insert with foreign owner_id fails RLS'
);

-- 4. A user cannot insert a membership in a company they don't belong to
select throws_ok(
  $$ insert into public.memberships (id, company_id, user_id, role)
     values ('ffffffff-ffff-4fff-8fff-ffffffffffff',
             'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
             '11111111-1111-4111-8111-111111111111',
             'owner') $$,
  'new row violates row-level security policy',
  'Cross-company membership insert fails RLS'
);

-- 5. Users can read their own profile
select is(
  (select count(*) from public.users_profile where id = '11111111-1111-4111-8111-111111111111'),
  1::bigint,
  'User can read own profile'
);

-- 6. A user cannot read the other user's profile via users_profile
select is(
  (select count(*) from public.users_profile where id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'Cross-tenant profile read is blocked'
);

-- 7. Memberships are visible only within own company
select is(
  (select count(*) from public.memberships where company_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'Memberships in other company are not visible'
);

-- 8. Subscriptions are company-scoped
select is(
  (select count(*) from public.subscriptions where company_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'Subscription in other company is not visible'
);

-- 9. Service role bypasses RLS
select tests.reset_role();
select is(
  (select count(*) from public.companies),
  2::bigint,
  'Service role sees both companies'
);

-- 10. Webhook events are service-role only (no policy = blocked for users)
select tests.as_user('11111111-1111-4111-8111-111111111111', '{}'::jsonb);
insert into public.processed_webhook_events (event_id, source)
values ('evt_test_1', 'stripe') on conflict do nothing;
select is(
  (select count(*) from public.processed_webhook_events where event_id = 'evt_test_1'),
  0::bigint,
  'Users cannot write webhook events'
);

select * from finish();
rollback;
