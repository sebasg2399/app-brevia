import { describe, it, expect, beforeEach } from 'vitest';
import { StartCheckout } from '@app/use-cases/start-checkout';
import { OpenCustomerPortal } from '@app/use-cases/open-customer-portal';
import { HandleStripeWebhook } from '@app/use-cases/handle-stripe-webhook';
import { Company } from '@domain/entities/company';
import { Membership } from '@domain/entities/membership';
import { Subscription } from '@domain/entities/subscription';
import { Plan } from '@domain/value-objects/plan';
import { Slug } from '@domain/value-objects/slug';
import { Email } from '@domain/value-objects/email';
import { User } from '@domain/entities/user';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';
import {
  FakeClock,
  FakeIdGenerator,
  FakeStripeGateway,
  InMemoryCompanyRepository,
  InMemoryMembershipRepository,
  InMemorySubscriptionRepository,
  InMemoryUserRepository,
  InMemoryWebhookEventRepository,
} from '../__support__/fakes';
import type { StripeEvent } from '@app/ports/stripe-gateway';

const ownerId = (await import('@domain/value-objects/branded-id')).UserId.fromString(
  '12345678-1234-4234-8234-123456789012',
);
const coachId = (await import('@domain/value-objects/branded-id')).UserId.fromString(
  '22345678-1234-4234-8234-123456789012',
);
const companyId = (await import('@domain/value-objects/branded-id')).CompanyId.fromString(
  '32345678-1234-4234-8234-123456789012',
);

interface Harness {
  companies: InMemoryCompanyRepository;
  users: InMemoryUserRepository;
  memberships: InMemoryMembershipRepository;
  subscriptions: InMemorySubscriptionRepository;
  events: InMemoryWebhookEventRepository;
  stripe: FakeStripeGateway;
  clock: FakeClock;
}

async function buildHarness(): Promise<Harness> {
  const clock = new FakeClock('2026-01-01T00:00:00.000Z');
  const companies = new InMemoryCompanyRepository();
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const subscriptions = new InMemorySubscriptionRepository();
  const events = new InMemoryWebhookEventRepository();
  const stripe = new FakeStripeGateway();

  const company = Company.create({
    id: companyId,
    name: 'Acme',
    slug: Slug.create('acme'),
    ownerId,
    now: clock.now(),
  });
  await companies.save(company);

  await users.save(
    User.create({
      id: ownerId,
      email: Email.create('owner@x.com'),
      fullName: 'Owner',
      now: clock.now(),
    }),
  );
  await memberships.save(
    Membership.create({
      id: new FakeIdGenerator().newMembershipId(),
      companyId,
      userId: ownerId,
      role: 'owner',
      now: clock.now(),
    }),
  );

  const sub = Subscription.create({ companyId, plan: Plan.free(), now: clock.now() });
  await subscriptions.save(sub);

  return { companies, users, memberships, subscriptions, events, stripe, clock };
}

describe('StartCheckout', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('owner can start checkout for pro', async () => {
    h.stripe.nextCheckoutUrl = 'https://stripe.test/cs/123';
    h.stripe.nextCustomerId = 'cus_new_1';
    const sut = new StartCheckout({
      stripe: h.stripe,
      memberships: h.memberships,
      subscriptions: h.subscriptions,
      users: h.users,
      clock: h.clock,
    });
    const out = await sut.execute({
      companyId,
      actorId: ownerId,
      plan: 'pro',
      appUrl: 'http://localhost:3000',
    });
    expect(out.url).toBe('https://stripe.test/cs/123');
    expect(h.stripe.checkoutCalls).toHaveLength(1);
    expect(h.stripe.checkoutCalls[0]?.trialDays).toBe(7);
  });

  it('rejects free plan', async () => {
    const sut = new StartCheckout({
      stripe: h.stripe,
      memberships: h.memberships,
      subscriptions: h.subscriptions,
      users: h.users,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, plan: 'free', appUrl: 'x' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejects non-owner', async () => {
    await h.memberships.save(
      Membership.create({
        id: new FakeIdGenerator().newMembershipId(),
        companyId,
        userId: coachId,
        role: 'coach',
        now: h.clock.now(),
      }),
    );
    const sut = new StartCheckout({
      stripe: h.stripe,
      memberships: h.memberships,
      subscriptions: h.subscriptions,
      users: h.users,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: coachId, plan: 'pro', appUrl: 'x' }),
    ).rejects.toThrow(/only the workspace owner/i);
  });
});

describe('OpenCustomerPortal', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('owner with Stripe customer can open portal', async () => {
    const sub = await h.subscriptions.findByCompanyId(companyId);
    sub!.setStripeIds('cus_abc', 'sub_abc', h.clock.now());
    await h.subscriptions.save(sub!);
    h.stripe.nextPortalUrl = 'https://stripe.test/portal/abc';

    const sut = new OpenCustomerPortal({
      stripe: h.stripe,
      memberships: h.memberships,
      subscriptions: h.subscriptions,
    });
    const out = await sut.execute({ companyId, actorId: ownerId, appUrl: 'http://localhost:3000' });
    expect(out.url).toBe('https://stripe.test/portal/abc');
  });

  it('free plan has no portal', async () => {
    const sut = new OpenCustomerPortal({
      stripe: h.stripe,
      memberships: h.memberships,
      subscriptions: h.subscriptions,
    });
    await expect(sut.execute({ companyId, actorId: ownerId, appUrl: 'x' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('rejects non-owner', async () => {
    const sub = await h.subscriptions.findByCompanyId(companyId);
    sub!.setStripeIds('cus_abc', 'sub_abc', h.clock.now());
    await h.subscriptions.save(sub!);
    await h.memberships.save(
      Membership.create({
        id: new FakeIdGenerator().newMembershipId(),
        companyId,
        userId: coachId,
        role: 'coach',
        now: h.clock.now(),
      }),
    );
    const sut = new OpenCustomerPortal({
      stripe: h.stripe,
      memberships: h.memberships,
      subscriptions: h.subscriptions,
    });
    await expect(sut.execute({ companyId, actorId: coachId, appUrl: 'x' })).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe('HandleStripeWebhook', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('customer.subscription.created with trial sets status=trialing', async () => {
    const event: StripeEvent = {
      id: 'evt_1',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'trialing',
          current_period_end: Math.floor(Date.now() / 1000) + 7 * 86400,
          trial_end: Math.floor(Date.now() / 1000) + 7 * 86400,
          metadata: { companyId: companyId.toString() },
          items: [{ price: { id: 'price_pro' }, plan: { metadata: { plan: 'pro' } } }],
        },
      },
    };
    h.stripe.eventToReturn = event;
    const sut = new HandleStripeWebhook({
      stripe: h.stripe,
      subscriptions: h.subscriptions,
      events: h.events,
      clock: h.clock,
    });
    const out = await sut.execute({ rawBody: Buffer.from('x'), signature: 'sig' });
    expect(out.handled).toBe(true);
    expect(out.duplicate).toBe(false);
    const sub = await h.subscriptions.findByCompanyId(companyId);
    expect(sub?.status).toBe('trialing');
    expect(sub?.plan.name).toBe('pro');
    expect(sub?.stripeSubscriptionId).toBe('sub_1');
  });

  it('invoice.payment_failed marks subscription as past_due', async () => {
    // Pre-set a stripe customer
    const sub = await h.subscriptions.findByCompanyId(companyId);
    sub!.setStripeIds('cus_1', 'sub_1', h.clock.now());
    await h.subscriptions.save(sub!);

    const event: StripeEvent = {
      id: 'evt_2',
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_1' } },
    };
    h.stripe.eventToReturn = event;
    const sut = new HandleStripeWebhook({
      stripe: h.stripe,
      subscriptions: h.subscriptions,
      events: h.events,
      clock: h.clock,
    });
    await sut.execute({ rawBody: Buffer.from('x'), signature: 'sig' });
    const after = await h.subscriptions.findByCompanyId(companyId);
    expect(after?.status).toBe('past_due');
  });

  it('duplicate event is a no-op', async () => {
    const event: StripeEvent = {
      id: 'evt_3',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'active',
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          trial_end: 0,
          metadata: { companyId: companyId.toString() },
          items: [{ price: { id: 'p' }, plan: { metadata: { plan: 'pro' } } }],
        },
      },
    };
    h.stripe.eventToReturn = event;
    const sut = new HandleStripeWebhook({
      stripe: h.stripe,
      subscriptions: h.subscriptions,
      events: h.events,
      clock: h.clock,
    });
    const r1 = await sut.execute({ rawBody: Buffer.from('x'), signature: 'sig' });
    const r2 = await sut.execute({ rawBody: Buffer.from('x'), signature: 'sig' });
    expect(r1.handled).toBe(true);
    expect(r1.duplicate).toBe(false);
    expect(r2.handled).toBe(false);
    expect(r2.duplicate).toBe(true);
  });

  it('unknown event type is marked handled (no-op)', async () => {
    const event: StripeEvent = {
      id: 'evt_4',
      type: 'customer.created',
      data: { object: {} },
    };
    h.stripe.eventToReturn = event;
    const sut = new HandleStripeWebhook({
      stripe: h.stripe,
      subscriptions: h.subscriptions,
      events: h.events,
      clock: h.clock,
    });
    const out = await sut.execute({ rawBody: Buffer.from('x'), signature: 'sig' });
    expect(out.handled).toBe(true);
    expect(out.duplicate).toBe(false);
  });

  it('customer.subscription.deleted marks canceled', async () => {
    const sub = await h.subscriptions.findByCompanyId(companyId);
    sub!.setStripeIds('cus_1', 'sub_1', h.clock.now());
    sub!.updateStatus('active', h.clock.now());
    await h.subscriptions.save(sub!);

    const event: StripeEvent = {
      id: 'evt_5',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'canceled',
          current_period_end: Math.floor(Date.now() / 1000),
          trial_end: 0,
          metadata: { companyId: companyId.toString() },
          items: [{ price: { id: 'p' } }],
        },
      },
    };
    h.stripe.eventToReturn = event;
    const sut = new HandleStripeWebhook({
      stripe: h.stripe,
      subscriptions: h.subscriptions,
      events: h.events,
      clock: h.clock,
    });
    await sut.execute({ rawBody: Buffer.from('x'), signature: 'sig' });
    const after = await h.subscriptions.findByCompanyId(companyId);
    expect(after?.status).toBe('canceled');
  });
});
