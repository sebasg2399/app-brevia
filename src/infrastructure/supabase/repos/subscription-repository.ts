import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import { Subscription, type SubscriptionStatus } from '@domain/entities/subscription';
import { CompanyId } from '@domain/value-objects/branded-id';
import { Plan } from '@domain/value-objects/plan';

interface SubscriptionRow {
  company_id: string;
  plan: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByCompanyId(companyId: CompanyId): Promise<Subscription | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId.toString())
      .maybeSingle<SubscriptionRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle<SubscriptionRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(subscription: Subscription): Promise<void> {
    const row = {
      company_id: subscription.companyId.toString(),
      plan: subscription.plan.name,
      status: subscription.status,
      current_period_end: subscription.currentPeriodEnd,
      trial_ends_at: subscription.trialEndsAt,
      stripe_customer_id: subscription.stripeCustomerId,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
    };
    const { error } = await this.db.from('subscriptions').upsert(row);
    if (error) throw new Error(`Failed to save subscription: ${error.message}`);
  }

  private toDomain(row: SubscriptionRow): Subscription {
    return Subscription.reconstruct({
      companyId: CompanyId.fromString(row.company_id),
      plan: Plan.fromName(row.plan),
      status: row.status,
      currentPeriodEnd: row.current_period_end,
      trialEndsAt: row.trial_ends_at,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
