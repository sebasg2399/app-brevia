import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { Nav } from '@ui/components/nav';

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const { success, error } = await searchParams;
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');

  const db = await createSupabaseServerClient();
  const { data: sessionRow, error: queryError } = await db
    .from('sessions')
    .select(
      'id, company_id, coach_id, client_id, scheduled_at, duration_minutes, status, completed_at, canceled_at, created_at, coaches:coach_id ( id, display_name ), clients:client_id ( id, name )',
    )
    .eq('id', id)
    .maybeSingle();

  if (queryError || !sessionRow) notFound();
  const companyId = sessionRow.company_id;

  return (
    <>
      <Nav email={session.email.value} current="/sessions" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-900">
          ← All sessions
        </Link>

        <h1 className="mb-1 mt-4 text-2xl font-semibold text-slate-900">Session detail</h1>
        <p className="text-sm text-slate-500">
          {new Date(sessionRow.scheduled_at).toLocaleString()} · {sessionRow.duration_minutes} min
        </p>

        {success && (
          <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Status</dt>
              <dd className="mt-1 text-slate-900">{sessionRow.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Coach</dt>
              <dd className="mt-1 text-slate-900">
                {(sessionRow.coaches as { display_name?: string } | null)?.display_name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Client</dt>
              <dd className="mt-1 text-slate-900">
                {(sessionRow.clients as { name?: string } | null)?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Created</dt>
              <dd className="mt-1 text-slate-900">
                {new Date(sessionRow.created_at).toLocaleString()}
              </dd>
            </div>
          </dl>

          {sessionRow.status === 'scheduled' && (
            <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const { completeSessionAction } = await import('@ui/actions/wu-2');
                  await completeSessionAction(fd);
                }}
              >
                <input type="hidden" name="companyId" value={companyId} />
                <input type="hidden" name="sessionId" value={sessionRow.id} />
                <button
                  type="submit"
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Mark completed
                </button>
              </form>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const { cancelSessionAction } = await import('@ui/actions/wu-2');
                  await cancelSessionAction(fd);
                }}
              >
                <input type="hidden" name="companyId" value={companyId} />
                <input type="hidden" name="sessionId" value={sessionRow.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Cancel session
                </button>
              </form>
            </div>
          )}

          {sessionRow.status === 'completed' && (
            <p className="mt-6 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Session is completed. Transcript and AI notes (WU-3) will be available soon.
            </p>
          )}
          {sessionRow.status === 'canceled' && (
            <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Session was canceled.
            </p>
          )}
        </section>
      </main>
    </>
  );
}