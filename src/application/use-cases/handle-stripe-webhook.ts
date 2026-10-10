import type { StripeGateway, StripeEvent, StripeSubscriptionPayload, StripeEventType } from '@app/ports/stripe-gateway';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import type { WebhookEventRepository } from '@app/ports/webhook-event-repository';
import type { Clock } from '@app/ports/clock';
import { Plan, type PlanName } from '@domain/value-objects/plan';
import { CompanyId } from '@domain/value-objects/branded-id';
import { NotFoundError } from '@domain/errors/domain-error';

const HANDLED_EVENTS: ReadonlyArray<StripeEventType> = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
];

export class HandleStripeWebhook {
  constructor(
    private readonly deps: {
      stripe: StripeGateway;
      subscriptions: SubscriptionRepository;
      events: WebhookEventRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: { rawBody: Buffer; signature: string }): Promise<{ handled: boolean; duplicate: boolean }> {
    const event = this.deps.stripe.verifyWebhook(input.rawBody, input.signature);

    // Idempotency: markProcessed returns false on duplicate
    const isNew = await this.deps.events.markProcessed(event.id, 'stripe');
    if (!isNew) {
      return { handled: false, duplicate: true };
    }

    if (!HANDLED_EVENTS.includes(event.type as StripeEventType)) {
      return { handled: true, duplicate: false };
    }

    await this.dispatch(event);
    return { handled: true, duplicate: false };
  }

  private async dispatch(event: StripeEvent): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.upsertSubscription(event.data.object as StripeSubscriptionPayload);
        return;
      case 'customer.subscription.deleted':
        await this.markCanceled(event.data.object as StripeSubscriptionPayload);
        return;
      case 'invoice.payment_failed':
        await this.markByCustomer(this.invoiceCustomer(event), 'past_due');
        return;
      case 'invoice.payment_succeeded':
        await this.markByCustomer(this.invoiceCustomer(event), 'active');
        return;
      default:
        return;
    }
  }

  private invoiceCustomer(event: StripeEvent): string | null {
    const obj = event.data.object as { customer?: string };
    return obj?.customer ?? null;
  }

  private async upsertSubscription(payload: StripeSubscriptionPayload): Promise<void> {
    const companyId = this.findCompanyIdFromMetadata(payload.metadata);
    if (!companyId) throw new NotFoundError('Company', '(no companyId in metadata)');
    const plan = this.findPlan(payload);
    const status = this.mapStatus(payload.status);
    const currentPeriodEnd = new Date(payload.current_period_end * 1000).toISOString();
    const trialEndsAt =
      payload.trial_end && payload.trial_end > 0
        ? new Date(payload.trial_end * 1000).toISOString()
        : null;
    const now = this.deps.clock.now();

    const existing = await this.deps.subscriptions.findByCompanyId(companyId);
    if (!existing) throw new NotFoundError('Subscription', companyId.toString());
    existing.changePlan(plan, now);
    existing.updateStatus(status, now);
    existing.updateBillingPeriod(currentPeriodEnd, trialEndsAt, now);
    existing.setStripeIds(payload.customer, payload.id, now);
    await this.deps.subscriptions.save(existing);
  }

  private async markCanceled(payload: StripeSubscriptionPayload): Promise<void> {
    const companyId = this.findCompanyIdFromMetadata(payload.metadata);
    if (!companyId) return;
    const existing = await this.deps.subscriptions.findByCompanyId(companyId);
    if (!existing) return;
    const now = this.deps.clock.now();
    existing.updateStatus('canceled', now);
    await this.deps.subscriptions.save(existing);
  }

  private async markByCustomer(customerId: string | null, status: 'active' | 'past_due'): Promise<void> {
    if (!customerId) return;
    const subscription = await this.deps.subscriptions.findByStripeCustomerId(customerId);
    if (!subscription) return;
    const now = this.deps.clock.now();
    subscription.updateStatus(status, now);
    await this.deps.subscriptions.save(subscription);
  }

  private findCompanyIdFromMetadata(metadata: Record<string, string>): CompanyId | null {
    const id = metadata['companyId'];
    if (!id) return null;
    try {
      return CompanyId.fromString(id);
    } catch {
      return null;
    }
  }

  private findPlan(payload: StripeSubscriptionPayload): ReturnType<typeof Plan.fromName> {
    const priceMeta = payload.items?.[0]?.plan?.metadata?.['plan'];
    const planName: PlanName =
      priceMeta === 'pro' || priceMeta === 'team' ? priceMeta : 'pro';
    return Plan.fromName(planName);
  }

  private mapStatus(
    s: StripeSubscriptionPayload['status'],
  ): 'active' | 'trialing' | 'past_due' | 'canceled' {
    if (s === 'active' || s === 'trialing' || s === 'past_due' || s === 'canceled') return s;
    return 'active';
  }
}