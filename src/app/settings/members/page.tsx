import { redirect } from 'next/navigation';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { CompanyId } from '@domain/value-objects/branded-id';
import { inviteMemberAction, removeMemberAction } from '@ui/actions/members';
import { SubmitButton } from '@ui/components/forms/submit-button';
import { Nav } from '@ui/components/nav';

interface MembersPageProps {
  searchParams: Promise<{ companyId?: string; error?: string; success?: string }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');

  const db = await createSupabaseServerClient();
  const { data: memberships } = await db
    .from('memberships')
    .select('id, company_id, user_id, role, users_profile:user_id ( email, full_name )')
    .eq('user_id', session.userId.toString())
    .eq('role', 'owner')
    .limit(1);

  const owned = memberships?.[0];
  if (!owned) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-slate-900">No workspace to manage</h1>
        <p className="mt-2 text-sm text-slate-500">
          You are not an owner of any workspace. Ask the workspace owner to invite you.
        </p>
      </main>
    );
  }

  const companyId = CompanyId.fromString(owned.company_id);
  void companyId;

  const { data: company } = await db
    .from('companies')
    .select('id, name')
    .eq('id', owned.company_id)
    .single();

  const { data: members } = await db
    .from('memberships')
    .select('id, user_id, role, users_profile:user_id ( email, full_name ), created_at')
    .eq('company_id', owned.company_id)
    .order('created_at', { ascending: true });

  return (
    <>
      <Nav email={session.email.value} current="/settings/members" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">{company?.name ?? 'Workspace'}</h1>
          <p className="text-sm text-slate-500">Manage members and invitations</p>
        </div>

      {params.error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</div>
      )}
      {params.success && (
        <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {params.success}
        </div>
      )}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Invite a new member</h2>
        <form action={inviteMemberAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="companyId" value={owned.company_id} />
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="coach@example.com"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-700">Role</span>
            <select
              name="role"
              defaultValue="coach"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="coach">Coach</option>
              <option value="client">Client</option>
            </select>
          </label>
          <SubmitButton pendingLabel="Inviting...">Send invitation</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Members</h2>
        <ul className="flex flex-col gap-2">
          {members?.map((m) => {
            const profile = Array.isArray(m.users_profile) ? m.users_profile[0] : m.users_profile;
            const isOwner = m.role === 'owner';
            return (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {(profile as { full_name?: string | null; email: string } | null)?.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(profile as { email: string } | null)?.email ?? '—'} · {m.role}
                  </p>
                </div>
                {!isOwner && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="companyId" value={owned.company_id} />
                    <input type="hidden" name="membershipId" value={m.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      </main>
    </>
  );
}