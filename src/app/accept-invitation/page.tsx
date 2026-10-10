import { acceptInvitationAction } from '@ui/actions/invitations';
import { SubmitButton } from '@ui/components/forms/submit-button';

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { token, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Accept invitation</h1>
        <p className="mb-6 text-sm text-slate-500">Set a password to join the workspace.</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form action={acceptInvitationAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token ?? ''} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Password (min 8 chars)</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <SubmitButton pendingLabel="Joining...">Accept invitation</SubmitButton>
        </form>
      </div>
    </main>
  );
}
