import type { Subscription } from '@domain/entities/subscription';
import type { CompanyId } from '@domain/value-objects/branded-id';

export interface SubscriptionRepository {
  findByCompanyId(companyId: CompanyId): Promise<Subscription | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null>;
  save(subscription: Subscription): Promise<void>;
}
