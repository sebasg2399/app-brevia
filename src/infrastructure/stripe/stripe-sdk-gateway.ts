import 'server-only';
import Stripe from 'stripe';
import type {
  StripeGateway,
  CreateCheckoutInput,
  CreateCheckoutResult,
  CreatePortalInput,
  StripeEvent,
} from '@app/ports/stripe-gateway';
import { Plan } from '@domain/value-objects/plan';

function priceIdFor(plan: 'pro' | 'team' | string): string {
  if (plan !== 'pro' && plan !== 'team') {
    throw new Error(`No Stripe price for plan: ${plan}`);
  }
  // Map plan to Stripe price ID from env. We expect STRIPE_PRICE_ID_PRO / STRIPE_PRICE_ID_TEAM.
  const envVar = plan === 'pro' ? 'STRIPE_PRICE_ID_PRO' : 'STRIPE_PRICE_ID_TEAM';
  const id = process.env[envVar];
  if (!id) {
    throw new Error(`Missing Stripe price ID env var ${envVar}`);
  }
  return id;
}

export class StripeSdkGateway implements StripeGateway {
  private readonly client: Stripe;

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion,
    });
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    void Plan;
    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceIdFor(input.plan), quantity: 1 }],
      customer: input.existingCustomerId,
      customer_email: input.existingCustomerId ? undefined : input.customerEmail,
      client_reference_id: input.companyId,
      subscription_data: {
        trial_period_days: input.trialDays,
        metadata: { companyId: input.companyId, plan: input.plan },
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    return {
      url: session.url,
      customerId:
        typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? ''),
    };
  }

  async createPortalSession(input: CreatePortalInput): Promise<{ url: string }> {
    const session = await this.client.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  verifyWebhook(rawBody: Buffer, signature: string): StripeEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }
    const event = this.client.webhooks.constructEvent(rawBody, signature, secret);
    return {
      id: event.id,
      type: event.type,
      data: { object: event.data.object as unknown },
    };
  }
}

export class NoopStripeGateway implements StripeGateway {
  async createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    void input;
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs.');
  }
  async createPortalSession(): Promise<{ url: string }> {
    throw new Error('Stripe is not configured.');
  }
  verifyWebhook(): StripeEvent {
    throw new Error('Stripe is not configured.');
  }
}
