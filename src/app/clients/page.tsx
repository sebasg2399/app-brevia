import { redirect } from 'next/navigation';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { Nav } from '@ui/components/nav';

export default async function ClientsPage({
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
        <Nav email={session.email.value} current="/clients" />
        <p className="mt-8 text-sm text-slate-500">You don&apos;t belong to a workspace yet.</p>
      </main>
    );
  }

  const companyId = (firstMembership.companies as { id: string }[] | null)?.[0]?.id ?? '';
  const companyRaw = firstMembership.companies as { id: string; name: string }[] | null;
  const company = companyRaw?.[0] ?? null;

  const { data: clients } = await db
    .from('clients')
    .select('id, name, email, notes, deleted_at, created_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const canManage = firstMembership.role === 'owner' || firstMembership.role === 'coach';

  return (
    <>
      <Nav email={session.email.value} current="/clients" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
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

        {canManage && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Add a client</h2>
            <form
              action={async (fd: FormData) => {
                'use server';
                const { createClientAction } = await import('@ui/actions/wu-2');
                await createClientAction(fd);
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <input type="hidden" name="companyId" value={companyId} />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Name</span>
                <input
                  name="name"
                  type="text"
                  required
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Email (optional)</span>
                <input
                  name="email"
                  type="email"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700">Notes (optional)</span>
                <textarea
                  name="notes"
                  rows={2}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:col-span-2"
              >
                Add client
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Active clients ({clients?.length ?? 0})
          </h2>
          {clients && clients.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {clients.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between rounded-md border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.name}</p>
                    {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                    {c.notes && <p className="text-xs text-slate-400">{c.notes}</p>}
                  </div>
                  {firstMembership.role === 'owner' && (
                    <form
                      action={async (fd: FormData) => {
                        'use server';
                        const { deleteClientAction } = await import('@ui/actions/wu-2');
                        await deleteClientAction(fd);
                      }}
                    >
                      <input type="hidden" name="companyId" value={companyId} />
                      <input type="hidden" name="clientId" value={c.id} />
                      <button
                        type="submit"
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No clients yet.</p>
          )}
        </section>
      </main>
    </>
  );
}