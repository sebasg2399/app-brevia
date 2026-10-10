'use client';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || 'Something went wrong';
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-red-900">Action failed</h1>
        <p className="mb-4 text-sm text-red-700">{message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
