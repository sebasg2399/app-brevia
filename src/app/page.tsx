import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs uppercase tracking-wide text-slate-500">
          MVP · WU-1 in progress
        </span>
        <h1 className="text-5xl font-semibold tracking-tight text-slate-900">Brevia</h1>
        <p className="max-w-xl text-lg text-slate-600">
          AI Coaching Platform. Turn every session transcript into structured notes, action items,
          and a brief for the next session.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign-in"
          className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Create account
        </Link>
      </div>

      <footer className="mt-12 text-xs text-slate-400">
        Built with Next.js 15 + Supabase + Stripe + Anthropic
      </footer>
    </main>
  );
}
