import Link from 'next/link';
import { signOutAction } from '@ui/actions/auth';

export function Nav({ email, current }: { email: string; current: string }) {
  const items = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/coaches', label: 'Coaches' },
    { href: '/clients', label: 'Clients' },
    { href: '/sessions', label: 'Sessions' },
    { href: '/settings/members', label: 'Members' },
  ];
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <nav className="flex gap-1">
          <Link href="/dashboard" className="mr-4 text-sm font-semibold text-slate-900">
            Brevia
          </Link>
          {items.slice(1).map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`rounded-md px-3 py-1 text-sm ${
                current.startsWith(it.href)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{email}</span>
          <form action={signOutAction}>
            <button type="submit" className="text-xs text-slate-500 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}