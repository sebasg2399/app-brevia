import { redirect } from 'next/navigation';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');

  const db = await createSupabaseServerClient();
  const { data: memberships, error } = await db
    .from('memberships')
    .select('id, company_id, role, companies:company_id ( id, name, slug )')
    .eq('user_id', session.userId.toString());

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Welcome to Brevia</h1>
      <p className="mb-8 text-sm text-slate-500">Signed in as {session.email.value}</p>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Your workspaces</h2>
        {error && <p className="text-sm text-red-600">Failed to load memberships.</p>}
        {memberships && memberships.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {memberships.map((m) => {
              const company = Array.isArray(m.companies) ? m.companies[0] : m.companies;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(company as { name: string } | null)?.name ?? 'Workspace'}
                    </p>
                    <p className="text-xs text-slate-500">Role: {m.role}</p>
                  </div>
                  {m.role === 'owner' && (
                    <a
                      href="/settings/members"
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Manage members →
                    </a>
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
  );
}