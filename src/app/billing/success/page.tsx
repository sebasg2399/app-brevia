import Link from 'next/link';
import { Nav } from '@ui/components/nav';
import { getCurrentSession } from '@ui/actions/auth';

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = await getCurrentSession();
  return (
    <>
      <Nav email={session?.email.value ?? ''} current="/settings/members" />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-green-900">Subscription active</h1>
          <p className="mt-2 text-sm text-green-800">
            Your checkout completed successfully. The subscription status will update via
            webhook within a few seconds.
          </p>
          {session_id && (
            <p className="mt-1 text-xs text-green-700">Stripe session: {session_id}</p>
          )}
          <div className="mt-4 flex gap-2">
            <Link
              href="/settings/billing"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Go to billing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}