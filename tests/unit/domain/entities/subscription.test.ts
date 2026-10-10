import { describe, it, expect } from 'vitest';
import { Subscription } from '@domain/entities/subscription';
import { CompanyId } from '@domain/value-objects/branded-id';
import { Plan } from '@domain/value-objects/plan';
import { ValidationError } from '@domain/errors/domain-error';

const companyId = CompanyId.fromString('12345678-1234-4234-8234-123456789012');

describe('Subscription', () => {
  const now = '2026-01-01T00:00:00.000Z';

  it('defaults to free plan, active status', () => {
    const s = Subscription.create({ companyId, plan: Plan.free(), now });
    expect(s.plan.name).toBe('free');
    expect(s.status).toBe('active');
  });

  it('allowsAI is true for active and trialing', () => {
    const s1 = Subscription.create({ companyId, plan: Plan.free(), now, status: 'active' });
    expect(s1.allowsAI()).toBe(true);
    const s2 = Subscription.create({ companyId, plan: Plan.free(), now, status: 'trialing' });
    expect(s2.allowsAI()).toBe(true);
  });

  it('allowsAI is false for past_due and canceled', () => {
    const s1 = Subscription.create({ companyId, plan: Plan.free(), now, status: 'past_due' });
    expect(s1.allowsAI()).toBe(false);
    const s2 = Subscription.create({ companyId, plan: Plan.free(), now, status: 'canceled' });
    expect(s2.allowsAI()).toBe(false);
  });

  it('changePlan updates plan and updatedAt', () => {
    const s = Subscription.create({ companyId, plan: Plan.free(), now });
    s.changePlan(Plan.pro(), now);
    expect(s.plan.name).toBe('pro');
  });

  it('updateStatus to invalid status throws', () => {
    const s = Subscription.create({ companyId, plan: Plan.free(), now });
    expect(() => s.updateStatus('expired' as never, now)).toThrow(ValidationError);
  });

  it('updateStatus valid', () => {
    const s = Subscription.create({ companyId, plan: Plan.free(), now });
    s.updateStatus('past_due', now);
    expect(s.status).toBe('past_due');
    expect(s.allowsAI()).toBe(false);
  });

  it('setStripeIds', () => {
    const s = Subscription.create({ companyId, plan: Plan.free(), now });
    s.setStripeIds('cus_123', 'sub_123', now);
    expect(s.stripeCustomerId).toBe('cus_123');
    expect(s.stripeSubscriptionId).toBe('sub_123');
  });
});
