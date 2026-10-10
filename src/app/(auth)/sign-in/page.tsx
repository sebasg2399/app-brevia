import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signInAction } from '@ui/actions/auth';
import { getCurrentSession } from '@ui/actions/auth';
import { SubmitButton } from '@ui/components/forms/submit-button';

interface SignInPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;
  const session = await getCurrentSession();
  if (session) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to your Brevia workspace.</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form action={signInAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to Brevia?{' '}
          <Link href="/sign-up" className="font-medium text-brand-600 hover:underline">
            Create a workspace
          </Link>
        </p>
      </div>
    </main>
  );
}
