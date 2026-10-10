import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { Nav } from '@ui/components/nav';
import { Plan } from '@domain/value-objects/plan';
import { Subscription } from '@domain/entities/subscription';
import { CompanyId } from '@domain/value-objects/branded-id';
import { startCheckoutAction, openCustomerPortalAction } from '@ui/actions/wu-4';

interface BillingPageProps {
  searchParams: Promise<{ canceled?: string; success?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { canceled, success } = await searchParams;
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');

  const db = await createSupabaseServerClient();
  const { data: memberships } = await db
    .from('memberships')
    .select('company_id, role')
    .eq('user_id', session.userId.toString())
    .eq('role', 'owner')
    .limit(1);
  const owned = memberships?.[0];
  if (!owned) {
    return (
      <>
        <Nav email={session.email.value} current="/settings/members" />
        <main className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-2xl font-semibold text-slate-900">No workspace to manage</h1>
          <p className="mt-2 text-sm text-slate-500">You are not an owner of any workspace.</p>
        </main>
      </>
    );
  }
  const companyId = CompanyId.fromString(owned.company_id);

  const { data: subRow } = await db
    .from('subscriptions')
    .select('plan, status, current_period_end, trial_ends_at, stripe_customer_id')
    .eq('company_id', owned.company_id)
    .maybeSingle();

  const sub: Subscription | null = subRow
    ? Subscription.reconstruct({
        companyId,
        plan: Plan.fromName(subRow.plan),
        status: subRow.status,
        currentPeriodEnd: subRow.current_period_end,
        trialEndsAt: subRow.trial_ends_at,
        stripeCustomerId: subRow.stripe_customer_id,
        stripeSubscriptionId: null,
        createdAt: '',
        updatedAt: '',
      })
    : null;

  const currentPlan = sub?.plan ?? Plan.free();
  const isOnPaidPlan = sub?.stripeCustomerId != null;

  return (
    <>
      <Nav email={session.email.value} current="/settings/members" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500">Manage your subscription and plan</p>

        {canceled && (
          <div className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            Checkout was canceled. No changes made.
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-medium text-slate-500">Current plan</h2>
          <p className="text-2xl font-semibold text-slate-900">{currentPlan.displayName}</p>
          <p className="mt-1 text-sm text-slate-500">
            Status: <span className="font-medium text-slate-700">{sub?.status ?? 'active'}</span>
            {' · '}
            {currentPlan.monthlyNotes} AI notes / month
          </p>
          {sub?.trialEndsAt && sub.status === 'trialing' && (
            <p className="mt-1 text-xs text-slate-500">
              Trial ends {new Date(sub.trialEndsAt).toLocaleDateString()}.
            </p>
          )}
          {isOnPaidPlan && (
            <form action={openCustomerPortalAction} className="mt-4">
              <input type="hidden" name="companyId" value={owned.company_id} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage payment methods & invoices
              </button>
            </form>
          )}
        </section>

        {currentPlan.name === 'free' && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Choose a plan</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PlanCard
                name="pro"
                title="Pro"
                price="$29 / month"
                bullets={[
                  '50 AI notes / month',
                  'Unlimited coaches & clients',
                  '7-day free trial',
                  'Email support',
                ]}
                companyId={owned.company_id}
                highlighted
              />
              <PlanCard
                name="team"
                title="Team"
                price="$99 / month"
                bullets={['500 AI notes / month', 'Everything in Pro', 'Priority support']}
                companyId={owned.company_id}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Note: Stripe is not configured in this environment. Checkout will fail until{' '}
              <code className="rounded bg-slate-100 px-1">STRIPE_SECRET_KEY</code> is set.
            </p>
          </section>
        )}

        <p className="mt-6 text-xs text-slate-400">
          <Link href="/dashboard" className="hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </main>
    </>
  );
}

function PlanCard({
  name,
  title,
  price,
  bullets,
  companyId,
  highlighted,
}: {
  name: 'pro' | 'team';
  title: string;
  price: string;
  bullets: string[];
  companyId: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlighted ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white'
      }`}
    >
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-2xl font-bold text-slate-900">{price}</p>
      <ul className="mt-3 space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-0.5 text-brand-600">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <form action={startCheckoutAction} className="mt-4">
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="plan" value={name} />
        <button
          type="submit"
          className={`w-full rounded-md px-4 py-2 text-sm font-semibold ${
            highlighted
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Start 7-day trial
        </button>
      </form>
    </div>
  );
}
