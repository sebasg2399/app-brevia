import type { CompanyId } from '@domain/value-objects/branded-id';
import type { Plan } from '@domain/value-objects/plan';
import { ValidationError } from '@domain/errors/domain-error';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface SubscriptionProps {
  readonly companyId: CompanyId;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  readonly currentPeriodEnd: string | null;
  readonly trialEndsAt: string | null;
  readonly stripeCustomerId: string | null;
  readonly stripeSubscriptionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class Subscription {
  private constructor(private props: SubscriptionProps) {}

  static create(input: {
    companyId: CompanyId;
    plan: Plan;
    status?: SubscriptionStatus;
    currentPeriodEnd?: string | null;
    trialEndsAt?: string | null;
    now: string;
  }): Subscription {
    return new Subscription({
      companyId: input.companyId,
      plan: input.plan,
      status: input.status ?? 'active',
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      trialEndsAt: input.trialEndsAt ?? null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  changePlan(plan: Plan, now: string): void {
    this.props = { ...this.props, plan, updatedAt: now };
  }

  updateStatus(status: SubscriptionStatus, now: string): void {
    if (!['active', 'past_due', 'canceled', 'trialing'].includes(status)) {
      throw new ValidationError(`Invalid subscription status: ${status}`);
    }
    this.props = { ...this.props, status, updatedAt: now };
  }

  updateBillingPeriod(currentPeriodEnd: string | null, trialEndsAt: string | null, now: string): void {
    this.props = { ...this.props, currentPeriodEnd, trialEndsAt, updatedAt: now };
  }

  setStripeIds(customerId: string, subscriptionId: string, now: string): void {
    this.props = {
      ...this.props,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: now,
    };
  }

  allowsAI(): boolean {
    return this.props.status === 'active' || this.props.status === 'trialing';
  }

  isTrialing(now: string): boolean {
    return (
      this.props.status === 'trialing' &&
      this.props.trialEndsAt !== null &&
      Date.parse(now) < Date.parse(this.props.trialEndsAt)
    );
  }

  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get plan(): Plan {
    return this.props.plan;
  }
  get status(): SubscriptionStatus {
    return this.props.status;
  }
  get currentPeriodEnd(): string | null {
    return this.props.currentPeriodEnd;
  }
  get trialEndsAt(): string | null {
    return this.props.trialEndsAt;
  }
  get stripeCustomerId(): string | null {
    return this.props.stripeCustomerId;
  }
  get stripeSubscriptionId(): string | null {
    return this.props.stripeSubscriptionId;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}