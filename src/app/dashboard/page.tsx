import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { Nav } from '@ui/components/nav';

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');

  const db = await createSupabaseServerClient();
  const { data: memberships } = await db
    .from('memberships')
    .select('id, company_id, role, companies:company_id ( id, name, slug )')
    .eq('user_id', session.userId.toString());

  const owned = memberships?.find((m) => m.role === 'owner');
  const companyId = (owned?.companies as { id: string }[] | null)?.[0]?.id;
  const companyRaw = owned?.companies as { id: string; name: string; slug: string }[] | null;
  const company = companyRaw?.[0] ?? null;

  let coachCount = 0;
  let clientCount = 0;
  let upcomingSessionCount = 0;

  if (companyId) {
    const [{ count: cc }, { count: clc }, { count: sc }] = await Promise.all([
      db.from('coaches').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      db
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null),
      db
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'scheduled'),
    ]);
    coachCount = cc ?? 0;
    clientCount = clc ?? 0;
    upcomingSessionCount = sc ?? 0;
  }

  return (
    <>
      <Nav email={session.email.value} current="/dashboard" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            {company?.name ?? 'Welcome to Brevia'}
          </h1>
          <p className="text-sm text-slate-500">
            {owned ? 'You are the workspace owner.' : 'Signed in as ' + session.email.value}
          </p>
        </div>

        {companyId && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <Link
              href="/coaches"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              <p className="text-2xl font-semibold text-slate-900">{coachCount}</p>
              <p className="text-sm text-slate-500">Coaches</p>
            </Link>
            <Link
              href="/clients"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              <p className="text-2xl font-semibold text-slate-900">{clientCount}</p>
              <p className="text-sm text-slate-500">Clients</p>
            </Link>
            <Link
              href="/sessions"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              <p className="text-2xl font-semibold text-slate-900">{upcomingSessionCount}</p>
              <p className="text-sm text-slate-500">Upcoming sessions</p>
            </Link>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Your workspaces</h2>
          {memberships && memberships.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {memberships.map((m) => {
                const c = Array.isArray(m.companies) ? m.companies[0] : m.companies;
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {(c as { name: string } | null)?.name ?? 'Workspace'}
                      </p>
                      <p className="text-xs text-slate-500">Role: {m.role}</p>
                    </div>
                    {m.role === 'owner' && (
                      <Link
                        href="/settings/members"
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        Manage members →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">You have no workspaces yet.</p>
          )}
        </section>
      </main>
    </>
  );
}