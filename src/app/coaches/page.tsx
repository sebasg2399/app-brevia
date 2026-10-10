import { redirect } from 'next/navigation';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { Nav } from '@ui/components/nav';

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; companyId?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');

  const params = await searchParams;
  const db = await createSupabaseServerClient();

  // Find the active company for the current user (any membership)
  const { data: memberships } = await db
    .from('memberships')
    .select('company_id, role, companies:company_id ( id, name )')
    .eq('user_id', session.userId.toString());
  const firstMembership = memberships?.[0];
  if (!firstMembership) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Nav email={session.email.value} current="/coaches" />
        <p className="mt-8 text-sm text-slate-500">You don&apos;t belong to a workspace yet.</p>
      </main>
    );
  }

  const companyId = (firstMembership.companies as { id: string }[] | null)?.[0]?.id ?? '';
  const companyRaw = firstMembership.companies as { id: string; name: string }[] | null;
  const company = companyRaw?.[0] ?? null;

  const { data: coaches } = await db
    .from('coaches')
    .select('id, display_name, bio, focus_areas, hourly_rate_cents, is_active, user_id, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  return (
    <>
      <Nav email={session.email.value} current="/coaches" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Coaches</h1>
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

        {firstMembership.role === 'owner' && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Add a coach profile</h2>
            <form
              action={async (fd: FormData) => {
                'use server';
                const { createCoachAction } = await import('@ui/actions/wu-2');
                await createCoachAction(fd);
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <input type="hidden" name="companyId" value={companyId} />
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700">User ID (the coach&apos;s auth user)</span>
                <input
                  name="userId"
                  type="text"
                  required
                  placeholder="uuid"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Display name</span>
                <input
                  name="displayName"
                  type="text"
                  required
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Hourly rate (cents)</span>
                <input
                  name="hourlyRateCents"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700">Bio</span>
                <textarea
                  name="bio"
                  rows={3}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700">Focus areas (comma-separated)</span>
                <input
                  name="focusAreas"
                  type="text"
                  required
                  placeholder="career, leadership, mindfulness"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <span className="text-xs text-slate-400">1–8 areas, max 40 chars each</span>
              </label>
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:col-span-2"
              >
                Create coach
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Team ({coaches?.length ?? 0})</h2>
          {coaches && coaches.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {coaches.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between rounded-md border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {c.display_name}{' '}
                      {!c.is_active && (
                        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          inactive
                        </span>
                      )}
                    </p>
                    {c.bio && <p className="text-xs text-slate-500">{c.bio}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {Array.isArray(c.focus_areas) ? c.focus_areas.join(' · ') : ''}
                      {c.hourly_rate_cents > 0 && ` · $${(c.hourly_rate_cents / 100).toFixed(2)}/hr`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No coaches yet.</p>
          )}
        </section>
      </main>
    </>
  );
}