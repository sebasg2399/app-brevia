import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { Nav } from '@ui/components/nav';

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');
  const params = await searchParams;
  const db = await createSupabaseServerClient();

  const { data: memberships } = await db
    .from('memberships')
    .select('company_id, role, companies:company_id ( id, name )')
    .eq('user_id', session.userId.toString());
  const firstMembership = memberships?.[0];
  if (!firstMembership) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Nav email={session.email.value} current="/sessions" />
        <p className="mt-8 text-sm text-slate-500">You don&apos;t belong to a workspace yet.</p>
      </main>
    );
  }

  const companyId = (firstMembership.companies as { id: string }[] | null)?.[0]?.id ?? '';
  const companyRaw = firstMembership.companies as { id: string; name: string }[] | null;
  const company = companyRaw?.[0] ?? null;

  const { data: sessions } = await db
    .from('sessions')
    .select(
      'id, scheduled_at, duration_minutes, status, completed_at, canceled_at, coach_id, client_id, coaches:coach_id ( display_name ), clients:client_id ( name )',
    )
    .eq('company_id', companyId)
    .neq('status', 'archived')
    .order('scheduled_at', { ascending: true });

  const { data: coaches } = await db
    .from('coaches')
    .select('id, display_name')
    .eq('company_id', companyId)
    .eq('is_active', true);
  const { data: clients } = await db
    .from('clients')
    .select('id, name')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  const canBook = (coaches?.length ?? 0) > 0 && (clients?.length ?? 0) > 0;

  return (
    <>
      <Nav email={session.email.value} current="/sessions" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500">{company?.name ?? 'Workspace'}</p>
        </div>

        {params.success && (
          <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {params.success}
          </div>
        )}
        {params.error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</div>
        )}

        {canBook && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Book a session</h2>
            <form
              action={async (fd: FormData) => {
                'use server';
                const { bookSessionAction } = await import('@ui/actions/wu-2');
                await bookSessionAction(fd);
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <input type="hidden" name="companyId" value={companyId} />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Coach</span>
                <select
                  name="coachId"
                  required
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {coaches?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Client</span>
                <select
                  name="clientId"
                  required
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Scheduled at</span>
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  required
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Duration (min)</span>
                <select
                  name="durationMinutes"
                  defaultValue="30"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                </select>
              </label>
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:col-span-2"
              >
                Book session
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">All sessions</h2>
          {sessions && sessions.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => {
                const coach = Array.isArray(s.coaches) ? s.coaches[0] : s.coaches;
                const client = Array.isArray(s.clients) ? s.clients[0] : s.clients;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3"
                  >
                    <div>
                      <Link
                        href={`/sessions/${s.id}`}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        {(coach as { display_name?: string } | null)?.display_name ?? 'Coach'} ↔{' '}
                        {(client as { name?: string } | null)?.name ?? 'Client'}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        s.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-700'
                          : s.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : s.status === 'canceled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {s.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No sessions yet.</p>
          )}
        </section>
      </main>
    </>
  );
}