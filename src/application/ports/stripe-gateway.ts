import type { PlanName } from '@domain/value-objects/plan';

export interface CreateCheckoutInput {
  readonly companyId: string;
  readonly customerEmail: string;
  readonly plan: PlanName;
  readonly trialDays: number;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly existingCustomerId?: string;
}

export interface CreateCheckoutResult {
  readonly url: string;
  readonly customerId: string;
}

export interface CreatePortalInput {
  readonly customerId: string;
  readonly returnUrl: string;
}

export interface StripeSubscriptionPayload {
  readonly id: string;
  readonly customer: string;
  readonly status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';
  readonly current_period_end: number; // unix seconds
  readonly trial_end: number | null;
  readonly metadata: Record<string, string>;
  readonly items: ReadonlyArray<{ price: { id: string }; plan?: { metadata?: Record<string, string> } }>;
}

export type StripeEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded';

export interface StripeEvent {
  readonly id: string;
  readonly type: StripeEventType | string;
  readonly data: { object: unknown };
}

export interface StripeGateway {
  createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  createPortalSession(input: CreatePortalInput): Promise<{ url: string }>;
  verifyWebhook(rawBody: Buffer, signature: string): StripeEvent;
}